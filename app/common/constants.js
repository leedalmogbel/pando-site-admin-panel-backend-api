const withdrawalStatus = {
	NEW: 0,
	PENDING: 1,
	SUCCEED: 2,
	FAIL: 3
}

const withdrawalSpeed = {
	SLOW: 1,
	AVERAGE: 2,
	FAST: 3
}

const withdrawalSpeedSt = [
	'', 'Slow', 'Average', 'Fast'
];

const wallet_fields = [
	'decenternet_hot_wallet_address',
	'pando_hot_wallet_address'
];

const withdrawalSettingsFields = [
	'min_withdrawal_amount',
	'max_withdrawal_amount',
	'withdrawal_speed',
	'eth_balance_threshold',
	'pando_balance_threshold',
	'daily_withdraw_limit_amount',
	'daily_withdraw_limit_frequency'
];

const userRoles = {
	SUPER_ADMIN: 'Super Admin',
	ADMIN: 'Admin'
}

module.exports = {
	wallet_fields,
	withdrawalStatus,
	withdrawalSpeed,
	withdrawalSpeedSt,
	withdrawalSettingsFields,
	userRoles
}