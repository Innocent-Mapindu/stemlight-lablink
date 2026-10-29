// Checks the security rules in the Firestore emulator: npm run test:rules
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, deleteField, deleteDoc, query, where, increment, addDoc } from "firebase/firestore";

const env = await initializeTestEnvironment({ projectId: "demo-lablink", firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
const T = env.authenticatedContext("teacher").firestore();
const L = env.authenticatedContext("learner").firestore();
const O = env.authenticatedContext("outsider").firestore();
const A = env.unauthenticatedContext().firestore();
let n = 0; const ok = async (name, p) => { await p; n++; console.log("  ok", name); };

await ok("teacher creates class", assertSucceeds(setDoc(doc(T, "classes/ABC234"), { owner: "teacher", name: "Form 4B" })));
await ok("outsider cannot take over the code", assertFails(setDoc(doc(O, "classes/ABC234"), { owner: "outsider", name: "x" })));
await ok("cannot create a class for someone else", assertFails(setDoc(doc(O, "classes/XYZ999"), { owner: "teacher" })));
await ok("signed-out cannot read a class", assertFails(getDoc(doc(A, "classes/ABC234"))));
await ok("teacher sets work", assertSucceeds(setDoc(doc(T, "classes/ABC234/assign/a1"), { title: "Titration", lab: "chemistry" })));
await ok("non-member cannot read work", assertFails(getDocs(collection(L, "classes/ABC234/assign"))));
await ok("learner joins with code", assertSucceeds(setDoc(doc(L, "classes/ABC234/members/learner"), { name: "Rudo" })));
await ok("cannot join as someone else", assertFails(setDoc(doc(L, "classes/ABC234/members/other"), { name: "x" })));
await ok("member reads work", assertSucceeds(getDocs(collection(L, "classes/ABC234/assign"))));
await ok("member cannot set work", assertFails(setDoc(doc(L, "classes/ABC234/assign/a2"), { title: "x" })));
await ok("member cannot change question sets", assertFails(setDoc(doc(L, "classes/ABC234/qsets/q1"), { title: "x" })));
await ok("learner submits work", assertSucceeds(setDoc(doc(L, "classes/ABC234/subs/learner"), { nick: "Rudo", work: { a1: { score: 70 } }, _k: "a1" })));
await ok("learner cannot mark own work", assertFails(updateDoc(doc(L, "classes/ABC234/subs/learner"), { "work.a1.mod": { score: 100 }, _k: "a1" })));
await ok("learner cannot write another learner's work", assertFails(setDoc(doc(L, "classes/ABC234/subs/other"), { work: {} })));
await ok("outsider cannot read work", assertFails(getDoc(doc(O, "classes/ABC234/subs/learner"))));
await ok("teacher lists submissions", assertSucceeds(getDocs(collection(T, "classes/ABC234/subs"))));
await ok("teacher moderates", assertSucceeds(updateDoc(doc(T, "classes/ABC234/subs/learner"), { "work.a1.mod": { score: 65, comment: "Good" } })));
await ok("learner cannot remove the mark", assertFails(updateDoc(doc(L, "classes/ABC234/subs/learner"), { "work.a1.mod": deleteField(), _k: "a1" })));
await ok("learner reads own work and mark", assertSucceeds(getDoc(doc(L, "classes/ABC234/subs/learner"))));
await ok("learner cannot list class members", assertFails(getDocs(collection(L, "classes/ABC234/members"))));
await ok("teacher lists class members", assertSucceeds(getDocs(collection(T, "classes/ABC234/members"))));
await ok("teacher reopens work", assertSucceeds(updateDoc(doc(T, "classes/ABC234/subs/learner"), { "work.a1.mod": null, "work.a1.reopen": true })));
await ok("learner resubmits after reopen", assertSucceeds(updateDoc(doc(L, "classes/ABC234/subs/learner"), { "work.a1.score": 80, _k: "a1" })));
await ok("mislabelled write is refused", assertFails(updateDoc(doc(L, "classes/ABC234/subs/learner"), { "work.a2.score": 5, _k: "a1" })));
await ok("unlabelled write is refused", assertFails(updateDoc(doc(L, "classes/ABC234/subs/learner"), { "work.a3.score": 5 })));
await ok("own profile", assertSucceeds(setDoc(doc(L, "users/learner"), { name: "Rudo", role: "learner", progress: "" })));
await ok("cannot read others' profiles", assertFails(getDoc(doc(O, "users/learner"))));
await ok("learner cannot rename the class", assertFails(updateDoc(doc(L, "classes/ABC234"), { name: "x" })));
await ok("teacher cannot hand class to someone else", assertFails(updateDoc(doc(T, "classes/ABC234"), { owner: "outsider" })));

// ---------- tutors, lessons and payments ----------
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, "users/tutorT"), { role: "teacher", name: "Mrs N" });
  await setDoc(doc(db, "users/teacher2"), { role: "teacher", name: "Mr K" });
  await setDoc(doc(db, "users/learner"), { role: "learner", name: "Rudo" });
  await setDoc(doc(db, "users/outsider"), { role: "learner", name: "X" });
  await setDoc(doc(db, "admins/admin"), { since: "2026" });
});
const TT = env.authenticatedContext("tutorT").firestore();
const T2 = env.authenticatedContext("teacher2").firestore();
const AD = env.authenticatedContext("admin").firestore();
await ok("learner cannot become a tutor", assertFails(setDoc(doc(L, "tutors/learner"), { name: "R", verified: false })));
await ok("teacher applies as tutor (unverified)", assertSucceeds(setDoc(doc(TT, "tutors/tutorT"), { name: "Mrs N", verified: false, rate: 8 })));
await ok("teacher cannot apply already verified", assertFails(setDoc(doc(T2, "tutors/teacher2"), { name: "Mr K", verified: true })));
await ok("tutor cannot verify themselves", assertFails(updateDoc(doc(TT, "tutors/tutorT"), { verified: true })));
await ok("tutor edits own rate", assertSucceeds(updateDoc(doc(TT, "tutors/tutorT"), { rate: 9 })));
const req = { learner: "learner", learnerName: "Rudo", tutor: "tutorT", tutorName: "Mrs N", status: "open", minor: true, unread: { tutor: 1, learner: 0 }, offer: null, created: "2026-10-29" };
await ok("cannot request an unverified tutor", assertFails(setDoc(doc(L, "requests/r1"), req)));
await ok("admin verifies the tutor", assertSucceeds(updateDoc(doc(AD, "tutors/tutorT"), { verified: true })));
await ok("learner requests a lesson", assertSucceeds(setDoc(doc(L, "requests/r1"), req)));
await ok("cannot request as someone else", assertFails(setDoc(doc(O, "requests/r2"), { ...req })));
await ok("cannot create a request already paid", assertFails(setDoc(doc(L, "requests/r3"), { ...req, payment: { amount: 1 } })));
await ok("outsider cannot read the lesson", assertFails(getDoc(doc(O, "requests/r1"))));
await ok("learner lists own lessons", assertSucceeds(getDocs(query(collection(L, "requests"), where("learner", "==", "learner")))));
await ok("tutor lists requests to them", assertSucceeds(getDocs(query(collection(TT, "requests"), where("tutor", "==", "tutorT")))));
await ok("outsider cannot list someone's lessons", assertFails(getDocs(query(collection(O, "requests"), where("learner", "==", "learner")))));
await ok("learner cannot set the price", assertFails(updateDoc(doc(L, "requests/r1"), { offer: { amount: 1 }, status: "offered" })));
await ok("tutor makes an offer", assertSucceeds(updateDoc(doc(TT, "requests/r1"), { offer: { amount: 16, hours: 1, sessions: 2 }, status: "offered" })));
await ok("learner cannot mark it paid", assertFails(updateDoc(doc(L, "requests/r1"), { status: "paid" })));
await ok("learner accepts", assertSucceeds(updateDoc(doc(L, "requests/r1"), { status: "accepted" })));
await ok("tutor cannot raise the price after acceptance", assertFails(updateDoc(doc(TT, "requests/r1"), { offer: { amount: 99, hours: 1, sessions: 2 } })));
await ok("learner cannot write a payment", assertFails(updateDoc(doc(L, "requests/r1"), { payment: { amount: 16 } })));
await ok("tutor cannot mark it paid", assertFails(updateDoc(doc(TT, "requests/r1"), { status: "paid" })));
await ok("unread counters update", assertSucceeds(updateDoc(doc(L, "requests/r1"), { "unread.tutor": increment(1) })));
await ok("admin confirms payment", assertSucceeds(updateDoc(doc(AD, "requests/r1"), { status: "paid", payment: { amount: 16 } })));
await ok("cannot rate before the lesson", assertFails(setDoc(doc(L, "tutors/tutorT/ratings/r1"), { stars: 5 })));
await ok("learner marks the lesson done", assertSucceeds(updateDoc(doc(L, "requests/r1"), { status: "done" })));
await ok("tutor cannot record their own payout", assertFails(updateDoc(doc(TT, "requests/r1"), { payout: { amount: 14.4 } })));
await ok("outsider cannot rate", assertFails(setDoc(doc(O, "tutors/tutorT/ratings/r1"), { stars: 1 })));
await ok("learner rates the lesson", assertSucceeds(setDoc(doc(L, "tutors/tutorT/ratings/r1"), { stars: 5, text: "Great" })));
await ok("only one rating per lesson", assertFails(setDoc(doc(L, "tutors/tutorT/ratings/r1"), { stars: 1 })));
await ok("lesson party sends a message", assertSucceeds(addDoc(collection(L, "requests/r1/msgs"), { by: "learner", text: "Thank you" })));
await ok("outsider cannot message", assertFails(addDoc(collection(O, "requests/r1/msgs"), { by: "outsider", text: "hi" })));
await ok("cannot message as someone else", assertFails(addDoc(collection(L, "requests/r1/msgs"), { by: "tutorT", text: "hi" })));
await ok("tutor reads the messages", assertSucceeds(getDocs(collection(TT, "requests/r1/msgs"))));
await ok("outsider cannot read the messages", assertFails(getDocs(collection(O, "requests/r1/msgs"))));

// ---------- study groups ----------
await ok("learner starts a group", assertSucceeds(setDoc(doc(L, "groups/g1"), { name: "Form 4 Chemistry", listed: true, owner: "learner", members: { learner: true }, names: { learner: "Rudo" } })));
await ok("cannot start a group with other members", assertFails(setDoc(doc(L, "groups/g2"), { name: "x", listed: true, owner: "learner", members: { learner: true, outsider: true } })));
await ok("anyone lists public groups", assertSucceeds(getDocs(query(collection(O, "groups"), where("listed", "==", true)))));
await ok("cannot list all groups", assertFails(getDocs(collection(O, "groups"))));
await ok("non-member cannot read posts", assertFails(getDocs(collection(O, "groups/g1/posts"))));
await ok("outsider joins", assertSucceeds(updateDoc(doc(O, "groups/g1"), { "members.outsider": true, "names.outsider": "X" })));
await ok("cannot add someone else", assertFails(updateDoc(doc(O, "groups/g1"), { "members.tutorT": true })));
await ok("member cannot rename the group", assertFails(updateDoc(doc(O, "groups/g1"), { name: "Mine now" })));
await ok("member posts", assertSucceeds(setDoc(doc(O, "groups/g1/posts/p1"), { author: "outsider", text: "Why methyl orange?" })));
await ok("cannot post as someone else", assertFails(setDoc(doc(O, "groups/g1/posts/p2"), { author: "learner", text: "x" })));
await ok("owner deletes a post", assertSucceeds(deleteDoc(doc(L, "groups/g1/posts/p1"))));
await ok("member leaves", assertSucceeds(updateDoc(doc(O, "groups/g1"), { "members.outsider": false })));
await ok("ex-member cannot read posts", assertFails(getDocs(collection(O, "groups/g1/posts"))));

// ---------- reports ----------
await ok("anyone can report", assertSucceeds(addDoc(collection(L, "reports"), { by: "learner", text: "Asked for my number", kind: "lesson" })));
await ok("learners cannot read reports", assertFails(getDocs(collection(L, "reports"))));
await ok("admin reads reports", assertSucceeds(getDocs(collection(AD, "reports"))));

// ---------- FAQ ----------
await ok("learner cannot publish an answer", assertFails(setDoc(doc(L, "faq/f1"), { q: "Q", a: "A", approved: true, by: "learner" })));
await ok("teacher submits an answer for checking", assertSucceeds(setDoc(doc(TT, "faq/f1"), { q: "Q", a: "A", approved: false, by: "tutorT" })));
await ok("teacher cannot self-publish", assertFails(setDoc(doc(TT, "faq/f2"), { q: "Q", a: "A", approved: true, by: "tutorT" })));
await ok("learner cannot list unchecked answers", assertFails(getDocs(query(collection(L, "faq"), where("approved", "==", false)))));
await ok("admin publishes", assertSucceeds(updateDoc(doc(AD, "faq/f1"), { approved: true })));
await ok("learner lists published answers", assertSucceeds(getDocs(query(collection(L, "faq"), where("approved", "==", true)))));
await ok("first view creates stats", assertSucceeds(setDoc(doc(L, "faqStats/f1"), { views: increment(1) }, { merge: true })));
await ok("helpful vote", assertSucceeds(setDoc(doc(O, "faqStats/f1"), { helpful: increment(1) }, { merge: true })));
await ok("cannot stuff votes", assertFails(updateDoc(doc(O, "faqStats/f1"), { helpful: 50 })));
await ok("learner asks a question", assertSucceeds(setDoc(doc(L, "faqAsks/k1"), { text: "why meniscus", count: 1, answered: false })));
await ok("same question asked again", assertSucceeds(updateDoc(doc(O, "faqAsks/k1"), { count: increment(1) })));
await ok("cannot inflate a count", assertFails(updateDoc(doc(O, "faqAsks/k1"), { count: 40 })));
await ok("learner cannot mark it answered", assertFails(updateDoc(doc(L, "faqAsks/k1"), { answered: true, faq: "f1" })));
await ok("teacher marks it answered", assertSucceeds(updateDoc(doc(TT, "faqAsks/k1"), { answered: true, faq: "f1" })));
await env.cleanup();
console.log(`All ${n} rule checks passed.`);
