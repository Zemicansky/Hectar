  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
  import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    deleteUser,
    setPersistence,
    browserLocalPersistence
  } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
  import {
    getFirestore,
    collection,
    doc,
    getDocs,
    writeBatch,
    setDoc,
    getDoc,
    onSnapshot
  } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

  // Пробрасываем всё в window чтобы обычные <script> ниже могли использовать
  window._fbModular = {
    initializeApp, getAuth, GoogleAuthProvider, signInWithPopup,
    signInWithEmailAndPassword, createUserWithEmailAndPassword,
    signOut, onAuthStateChanged, sendPasswordResetEmail, deleteUser,
    setPersistence, browserLocalPersistence,
    getFirestore, collection, doc, getDocs, writeBatch, setDoc, getDoc, onSnapshot
  };
  window._firebaseSdkReady = true;
