const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const settingsSchema = new Schema({
	commission_rate: {
		type: Number
	},
	max_reward: {
		type: Number
	},
	referral_rate: {
		type: Number
	},
	min_withdrawal_amount: {
		type: Number
	},
	max_withdrawal_amount: {
		type: Number
	},
	withdrawal_speed: {
		type: Number
	},
	eth_balance_threshold: {
		type: Number
	},
	pando_balance_threshold: {
		type: Number
	},
	decenternet_hot_wallet_address: [String],
	pando_hot_wallet_address: [String],
	is_maintenance: {
		type: Boolean,
		default: false
	},
	enable_withdraw: {
		type: Boolean,
		default: true
	},
	pando_notif_email: {
		type: String
	},
	daily_withdraw_limit_amount: {
		type: Number,
		default: 0
	},
	daily_withdraw_limit_frequency: {
		type: Number,
		default: 1
	},
	no_plan_users_enable_withdraw: {
		type: Boolean,
		default: false
	},
});

settingsSchema.set("timestamps", true);
settingsSchema.plugin(uniqueValidator);
settingsSchema.set("toJSON", {
	virtuals: true,
	transform: function(doc, ret, options) {
		const comRateSt = ret.commission_rate.toString();
		if(comRateSt.includes('e')) {
			//check e-
			let splitArr = comRateSt.split('e-');
			let toFixedValue = 0;
			if(splitArr.length > 1) {
				toFixedValue = parseInt(splitArr[1]);
				ret.commission_rate_dec = Number(ret.commission_rate).toFixed(toFixedValue).replace(/\.?0+$/,"");
			} else {
				ret.commission_rate_dec = ret.commission_rate.toLocaleString('fullWide', { useGrouping: false });
			}
		} else {
			ret.commission_rate_dec = ret.commission_rate.toString(); 
		}

		const refRateSt = ret.referral_rate.toString();
		if(refRateSt.includes('e')){
			//check e-
			let splitArr = refRateSt.split('e-');
			let toFixedValue = 0;
			if(splitArr.length > 1){
				toFixedValue = parseInt(splitArr[1]);
				ret.referral_rate_dec = Number(ret.referral_rate).toFixed(toFixedValue).replace(/\.?0+$/,"");
			}else{
				ret.referral_rate_dec = ret.referral_rate.toLocaleString('fullWide', { useGrouping: false });
			}
		}else{
			ret.referral_rate_dec = ret.referral_rate.toString();
		}
	}
});

module.exports = mongoose.model("Settings", settingsSchema);