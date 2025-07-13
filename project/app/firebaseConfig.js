import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: "AIzaSyD732Yp5iis0gsDdbsHgi08o55aGbM5ptM",
  authDomain: "aurora-ec42c.firebaseapp.com",
  projectId: "aurora-ec42c",
  storageBucket: "aurora-ec42c.firebasestorage.app",
  messagingSenderId: "342184245240",
  appId: "1:342184245240:web:23e579c20caf175d93080d",
  measurementId: "G-3R6FZSWCXV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);