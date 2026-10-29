/* STEMLight LabLink payment server (Firebase Cloud Functions + Paynow).
   Learners (or their parent or guardian) pay LabLink for a lesson with EcoCash or OneMoney through Paynow.
   LabLink holds the money and pays the tutor after the lesson; payouts are recorded by an admin.

   Before deploying (see README, "Switch on online payments"):
     firebase functions:secrets:set PAYNOW_ID
     firebase functions:secrets:set PAYNOW_KEY
   Untested against the live Paynow service: run test payments in Paynow's test mode first. */
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { Paynow } = require("paynow");

admin.initializeApp();
const db = admin.firestore();
const PAYNOW_ID = defineSecret("PAYNOW_ID");
const PAYNOW_KEY = defineSecret("PAYNOW_KEY");
const REGION = "europe-west1";
const RESULT_URL = "https://" + REGION + "-" + process.env.GCLOUD_PROJECT + ".cloudfunctions.net/paynowResult";

function paynow() {
  const p = new Paynow(PAYNOW_ID.value(), PAYNOW_KEY.value());
  p.resultUrl = RESULT_URL;
  p.returnUrl = "https://innocent-mapindu.github.io/stemlight-lablink/";
  return p;
}
const cleanPhone = s => String(s || "").replace(/[^\d]/g, "").replace(/^263/, "0");

// Learner presses "Send payment request": Paynow sends a USSD prompt to the payer's phone.
exports.startPayment = onCall({ region: REGION, secrets: [PAYNOW_ID, PAYNOW_KEY] }, async req => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const { rid, method, phone } = req.data || {};
  if (!["ecocash", "onemoney"].includes(method)) throw new HttpsError("invalid-argument", "Choose EcoCash or OneMoney.");
  const ref = db.doc("requests/" + rid), snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Lesson not found.");
  const r = snap.data();
  if (r.learner !== req.auth.uid) throw new HttpsError("permission-denied", "Only the learner can pay for this lesson.");
  if (r.status !== "accepted" || !r.offer) throw new HttpsError("failed-precondition", "Accept the tutor's offer first.");
  const user = (await db.doc("users/" + req.auth.uid).get()).data() || {};
  const payer = cleanPhone(phone || (user.minor ? user.guardianPhone : ""));
  if (!/^07\d{8}$/.test(payer)) throw new HttpsError("invalid-argument", "Enter a Zimbabwean mobile number such as 0772 123 456.");
  const amount = Math.round(r.offer.amount * 100) / 100;
  const pay = db.collection("payments").doc();
  const p = paynow();
  const payment = p.createPayment("LabLink-" + pay.id, user.email || "payments@stemlight.example");
  payment.add(`LabLink ${r.subject} lesson with ${r.tutorName}`, amount);
  const res = await p.sendMobile(payment, payer, method);
  if (!res || !res.success) throw new HttpsError("unavailable", (res && res.error) || "Paynow did not accept the request. Try again.");
  await pay.set({ rid, learner: r.learner, tutor: r.tutor, amount, method, payer: payer.slice(0, 4) + "****" + payer.slice(-2), pollUrl: res.pollUrl, status: "sent", at: new Date().toISOString() });
  await ref.update({ payRef: pay.id });
  return { instructions: res.instructions || `Check the phone ending ${payer.slice(-3)} and enter the ${method === "onemoney" ? "OneMoney" : "EcoCash"} PIN to pay US$${amount.toFixed(2)}.` };
});

async function settle(payId) {
  const pay = db.doc("payments/" + payId), ps = await pay.get();
  if (!ps.exists) return { status: "unknown" };
  const P = ps.data();
  if (P.status === "paid") return { status: "paid" };
  const st = await paynow().pollTransaction(P.pollUrl);
  const paid = st && !st.error && ["paid", "awaiting delivery", "delivered"].includes(String(st.status).toLowerCase());
  if (!paid) return { status: (st && st.status) || "pending" };
  await db.runTransaction(async t => {
    const rq = db.doc("requests/" + P.rid), rs = await t.get(rq);
    t.update(pay, { status: "paid", paidAt: new Date().toISOString(), paynowRef: (st && st.paynowReference) || "" });
    if (rs.exists && rs.data().status === "accepted")
      t.update(rq, { status: "paid", updated: new Date().toISOString(), payment: { amount: P.amount, method: P.method, ref: "PN-" + payId.slice(0, 6).toUpperCase(), at: new Date().toISOString() },
        "unread.tutor": admin.firestore.FieldValue.increment(1) });
  });
  return { status: "paid" };
}

// The app polls this every few seconds after sending the request.
exports.checkPayment = onCall({ region: REGION, secrets: [PAYNOW_ID, PAYNOW_KEY] }, async req => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const r = (await db.doc("requests/" + req.data.rid).get()).data();
  if (!r || (r.learner !== req.auth.uid && r.tutor !== req.auth.uid)) throw new HttpsError("permission-denied", "Not your lesson.");
  if (!r.payRef) return { status: "none" };
  return settle(r.payRef);
});

// Paynow calls this when a payment changes state; we confirm by polling Paynow ourselves rather than trusting the call.
exports.paynowResult = onRequest({ region: REGION, secrets: [PAYNOW_ID, PAYNOW_KEY] }, async (req, res) => {
  const ref = String((req.body && req.body.reference) || "");
  const id = ref.startsWith("LabLink-") ? ref.slice(8) : "";
  if (id) { try { await settle(id); } catch (e) { console.error(e); } }
  res.status(200).send("OK");
});
