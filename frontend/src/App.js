import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EXPENSE_CATEGORIES = [
  "Transportation",
  "Food",
  "Party",
  "Investment",
  "Others",
];

function App() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expense: 0,
    balance: 0,
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    category: "",
    description: "",
  });

  useEffect(() => {
    fetchTransactions();
    fetchSummary();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API}/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  const handleAddTransaction = async () => {
    if (!formData.amount || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await axios.post(`${API}/transactions`, {
        type: formData.type,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
      });
      toast.success("Transaction added successfully");
      setIsAddDialogOpen(false);
      resetForm();
      fetchTransactions();
      fetchSummary();
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add transaction");
    }
  };

  const handleEditTransaction = async () => {
    if (!formData.amount || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await axios.put(`${API}/transactions/${currentTransaction.id}`, {
        type: formData.type,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
      });
      toast.success("Transaction updated successfully");
      setIsEditDialogOpen(false);
      setCurrentTransaction(null);
      resetForm();
      fetchTransactions();
      fetchSummary();
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error("Failed to update transaction");
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    try {
      await axios.delete(`${API}/transactions/${id}`);
      toast.success("Transaction deleted successfully");
      fetchTransactions();
      fetchSummary();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  const openEditDialog = (transaction) => {
    setCurrentTransaction(transaction);
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      category: transaction.category,
      description: transaction.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      type: "expense",
      amount: "",
      category: "",
      description: "",
    });
  };

  const openAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <Wallet className="header-icon" />
            <h1>Expense Manager</h1>
          </div>
          <Button
            onClick={openAddDialog}
            className="add-button"
            data-testid="add-transaction-btn"
          >
            <Plus className="w-5 h-5" />
            Add Transaction
          </Button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="summary-section" data-testid="summary-section">
        <Card className="summary-card income-card" data-testid="income-card">
          <div className="summary-icon-wrapper income-icon">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="summary-content">
            <p className="summary-label">Income</p>
            <p className="summary-amount" data-testid="total-income">
              {summary.total_income.toFixed(2)}
            </p>
          </div>
        </Card>

        <Card className="summary-card expense-card" data-testid="expense-card">
          <div className="summary-icon-wrapper expense-icon">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div className="summary-content">
            <p className="summary-label">Expense</p>
            <p className="summary-amount" data-testid="total-expense">
              {summary.total_expense.toFixed(2)}
            </p>
          </div>
        </Card>

        <Card className="summary-card balance-card" data-testid="balance-card">
          <div className="summary-icon-wrapper balance-icon">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="summary-content">
            <p className="summary-label">Balance</p>
            <p className="summary-amount" data-testid="total-balance">
              ${summary.balance.toFixed(2)}
            </p>
          </div>
        </Card>
      </div>

      {/* Transactions List */}
      <div className="transactions-section">
        <h2 className="transactions-title">All Transactions</h2>
        <div className="transactions-list" data-testid="transactions-list">
          {transactions.length === 0 ? (
            <div className="empty-state">
              <p>No transactions yet. Add your first transaction!</p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <Card
                key={transaction.id}
                className="transaction-card"
                data-testid={`transaction-${transaction.id}`}
              >
                <div className="transaction-main">
                  <div className="transaction-info">
                    <div
                      className={`transaction-type-badge ${
                        transaction.type === "income"
                          ? "income-badge"
                          : "expense-badge"
                      }`}
                    >
                      {transaction.type === "income" ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {transaction.type.toUpperCase()}
                    </div>
                    <div>
                      <p className="transaction-category" data-testid={`transaction-category-${transaction.id}`}>
                        {transaction.category}
                      </p>
                      {transaction.description && (
                        <p className="transaction-description">
                          {transaction.description}
                        </p>
                      )}
                      <p className="transaction-date">
                        {formatDate(transaction.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="transaction-right">
                    <p
                      className={`transaction-amount ${
                        transaction.type === "income"
                          ? "amount-income"
                          : "amount-expense"
                      }`}
                      data-testid={`transaction-amount-${transaction.id}`}
                    >
                      {transaction.type === "income" ? "+" : "-"}$
                      {transaction.amount.toFixed(2)}
                    </p>
                    <div className="transaction-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(transaction)}
                        className="action-button"
                        data-testid={`edit-btn-${transaction.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        className="action-button delete-button"
                        data-testid={`delete-btn-${transaction.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="add-transaction-dialog">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Add a new income or expense transaction
            </DialogDescription>
          </DialogHeader>
          <div className="dialog-form">
            <div className="form-group">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value, category: "" })
                }
              >
                <SelectTrigger data-testid="add-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income" data-testid="type-income">Income</SelectItem>
                  <SelectItem value="expense" data-testid="type-expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="form-group">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger data-testid="add-category-select">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {formData.type === "expense"
                    ? EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} data-testid={`category-${cat.toLowerCase()}`}>
                          {cat}
                        </SelectItem>
                      ))
                    : <SelectItem value="Income" data-testid="category-income">Income</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="form-group">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                data-testid="add-amount-input"
              />
            </div>

            <div className="form-group">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Add a note..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                data-testid="add-description-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              data-testid="add-cancel-btn"
            >
              Cancel
            </Button>
            <Button onClick={handleAddTransaction} data-testid="add-submit-btn">
              Add Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="edit-transaction-dialog">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update your transaction details
            </DialogDescription>
          </DialogHeader>
          <div className="dialog-form">
            <div className="form-group">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value, category: "" })
                }
              >
                <SelectTrigger data-testid="edit-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income" data-testid="edit-type-income">Income</SelectItem>
                  <SelectItem value="expense" data-testid="edit-type-expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="form-group">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger data-testid="edit-category-select">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {formData.type === "expense"
                    ? EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} data-testid={`edit-category-${cat.toLowerCase()}`}>
                          {cat}
                        </SelectItem>
                      ))
                    : <SelectItem value="Income" data-testid="edit-category-income">Income</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="form-group">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                data-testid="edit-amount-input"
              />
            </div>

            <div className="form-group">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Input
                id="edit-description"
                placeholder="Add a note..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                data-testid="edit-description-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              data-testid="edit-cancel-btn"
            >
              Cancel
            </Button>
            <Button onClick={handleEditTransaction} data-testid="edit-submit-btn">
              Update Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
