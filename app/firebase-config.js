/* Paste your Firebase web app settings here to switch on accounts (see README, "Switch on accounts").
   Until apiKey and projectId are filled in, LabLink runs in demo mode with data kept on the device.
   These values are not secret: Firebase security rules (firestore.rules) protect the data. */
window.LABLINK_FIREBASE = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

/* Online payments through Paynow: set to true once the payment server in functions/ is deployed (see README). */
window.LABLINK_PAYMENTS = false;
