import mongoose from 'mongoose';
const { Schema } = mongoose;
await mongoose.connect('mongodb://127.0.0.1:27017/user_analytics', { serverSelectionTimeoutMS: 3000 });
const Event = mongoose.model('Event', new Schema({}, { strict: false }));
const recent = await Event.find({ event_type: 'click', page_url: /\/demo/ }).sort({ timestamp: -1 }).limit(3);
console.log('Recent 3 click events (raw Mongoose docs):');
recent.forEach((e, i) => {
  const raw = e.toObject({ virtuals: false });
  console.log(`\n--- Event ${i+1} ---`);
  console.log(JSON.stringify(raw, null, 2));
});
await mongoose.disconnect();
