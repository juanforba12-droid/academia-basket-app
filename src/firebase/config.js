import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:            "AIzaSyCfxoADo4E6bpFFe1N9_DkZvYl2yewijhI",
  authDomain:        "academia-basket-app.firebaseapp.com",
  projectId:         "academia-basket-app",
  storageBucket:     "academia-basket-app.firebasestorage.app",
  messagingSenderId: "573776541077",
  appId:             "1:573776541077:web:9da12db6d5c54dbcce329c",
};

const app = initializeApp(firebaseConfig);
export const db      = getFirestore(app);
export const auth    = getAuth(app);
export const storage = getStorage(app);
