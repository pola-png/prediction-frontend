
const mongoose = require('mongoose');
const { Schema } = mongoose;

const TeamSchema = new Schema({
    name: { type: String, required: true, unique: true },
    logoUrl: String,
});

module.exports = mongoose.model('Team', TeamSchema);
