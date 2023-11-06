const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
	phone: {
		type: Number,
		require: true,
	},
	favoritesDoctors: [Number],
	favoritesMedicines: [Number],
	cartItems: [Number],
});

module.exports = mongoose.model("User", userSchema);
