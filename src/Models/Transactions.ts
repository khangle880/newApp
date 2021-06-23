import firebase from "firebase";
import { firestore } from "../firebase";
import { Category } from "./Categories";
import { Wallet } from "./Wallets";

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  amount_by_wallet: number;
  category: string;
  note: string;
  with: string;
  event: string;
  remind: string;
  exclude_from_report: boolean;
  executed_time: string;
  transactions_list?: Transaction[];
}

export function toTransaction(doc: any): Transaction {
  const transaction: any = {
    id: doc.id,
    ...doc.data(),
  };
  return transaction as Transaction;
}

export function addTransaction(
  data: any,
  userId: string,
  wallet: Wallet,
  rootTransaction?: Transaction
) {
  const category = { ...data.category } as Category;
  data.category = data.category.id;

  firestore
    .collection("users")
    .doc(userId)
    .collection("wallets")
    .doc(wallet.id)
    .collection("transactions")
    .add(data)
    .then((docRef) => {
      const id = docRef.id;
      const newTransaction = { id, ...data } as Transaction;
      wallet.transactions.push(newTransaction);
      wallet.balance +=
        category?.type === "Expense" ||
        category.name === "Loan" ||
        category.name === "Repayment"
          ? -data.amount_by_wallet
          : category?.type === "Income" ||
            category.name === "Debt" ||
            category.name === "Debt Collection"
          ? data.amount_by_wallet
          : 0;

      if (category.name === "Loan") {
        const ref = wallet.debts.loansByPartner.find(
          (child) => child.with === data.with
        );
        if (ref) ref.transactions.push(newTransaction);
        else
          wallet.debts.loansByPartner.push({
            with: data.with,
            transactions: [newTransaction],
          });
      }

      if (category.name === "Debt") {
        const ref = wallet.debts.debtsByPartner.find(
          (child) => child.with === data.with
        );
        if (ref) ref.transactions.push(newTransaction);
        else
          wallet.debts.debtsByPartner.push({
            with: data.with,
            transactions: [newTransaction],
          });
      }

      if (
        category.name === "Debt Collection" ||
        category.name === "Repayment"
      ) {
        rootTransaction?.transactions_list?.push(newTransaction);
        firestore
          .collection("users")
          .doc(userId)
          .collection("wallets")
          .doc(wallet.id)
          .collection("transactions")
          .doc(rootTransaction?.id)
          .collection("transactions")
          .add(data);
      }
    });

  firestore
    .collection("users")
    .doc(userId)
    .collection("wallets")
    .doc(wallet.id)
    .update({
      balance: firebase.firestore.FieldValue.increment(
        category?.type === "Expense" ||
          category.name === "Loan" ||
          category.name === "Repayment"
          ? -data.amount_by_wallet
          : category?.type === "Income" ||
            category.name === "Debt" ||
            category.name === "Debt Collection"
          ? data.amount_by_wallet
          : 0
      ),
    });
}

// export var transactions: Transaction[] = [];

// export function clearTransactions() {
//   transactions = [];
// }

// export function initTransactions(user_id: string, wallet_id: string) {
//   const transactionsRef = firestore
//     .collection("users")
//     .doc(user_id)
//     .collection("wallets")
//     .doc(wallet_id)
//     .collection("transactions");

//   return transactionsRef.get().then(({ docs }) => {
//     transactions = docs.map(toTransaction);
//   });
// }
