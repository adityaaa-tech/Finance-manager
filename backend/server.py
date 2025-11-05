from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "income" or "expense"
    amount: float
    category: str  # For expense: Transportation, Food, Party, Investment, Others; For income: Income
    description: Optional[str] = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TransactionCreate(BaseModel):
    type: str
    amount: float
    category: str
    description: Optional[str] = ""


class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None


class Summary(BaseModel):
    total_income: float
    total_expense: float
    balance: float


# Routes
@api_router.get("/")
async def root():
    return {"message": "Expense Manager API"}


@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(input: TransactionCreate):
    transaction_obj = Transaction(**input.model_dump())
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = transaction_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.transactions.insert_one(doc)
    return transaction_obj


@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions():
    # Exclude MongoDB's _id field from the query results
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    
    # Convert ISO string timestamps back to datetime objects and sort by timestamp descending
    for transaction in transactions:
        if isinstance(transaction['timestamp'], str):
            transaction['timestamp'] = datetime.fromisoformat(transaction['timestamp'])
    
    # Sort by timestamp descending (newest first)
    transactions.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return transactions


@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str):
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if isinstance(transaction['timestamp'], str):
        transaction['timestamp'] = datetime.fromisoformat(transaction['timestamp'])
    
    return transaction


@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, input: TransactionUpdate):
    # Get existing transaction
    existing = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update only provided fields
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    
    if update_data:
        await db.transactions.update_one(
            {"id": transaction_id},
            {"$set": update_data}
        )
    
    # Get updated transaction
    updated = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    
    if isinstance(updated['timestamp'], str):
        updated['timestamp'] = datetime.fromisoformat(updated['timestamp'])
    
    return updated


@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    result = await db.transactions.delete_one({"id": transaction_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {"message": "Transaction deleted successfully"}


@api_router.get("/summary", response_model=Summary)
async def get_summary():
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    total_expense = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    balance = total_income - total_expense
    
    return Summary(
        total_income=total_income,
        total_expense=total_expense,
        balance=balance
    )


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
