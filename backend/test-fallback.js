require('dotenv').config();
const mongoose = require('mongoose');
const HSCode = require('./models/HSCode');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    const q = 'laptop';
    const words = q.split(' ').filter(w => w.length > 2);
    const searchRegexes = words.length > 0 ? words.map(w => new RegExp(w, 'i')) : [new RegExp(q, 'i')];
    
    console.log("Regexes:", searchRegexes);
    
    const fallbackResults = await HSCode.find({
        productName: { $in: searchRegexes }
    }).limit(10).lean();
    
    console.log("Results length:", fallbackResults.length);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
});
