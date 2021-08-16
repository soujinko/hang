import request from 'request';
import Crypto from 'crypto'
import dotenv from 'dotenv'

dotenv.config()

const NC_SMS = (req, next, authNumber) => {
	const accessKey = process.env.NC_ACCESS_KEY;	
	const secretKey = process.env.NC_SECRET_KEY;
	const serviceId = process.env.NC_SERVICE_ID;
	const sendingNumber = process.env.NC_SENDING_NUMBER;
	const phoneNumber = req.body.pNum;
	const space = " ";
	const newLine = "\n";
	const method = "POST";
	const url = `/sms/v2/services/${serviceId}/messages`;	// url (include query string)
	const timestamp = Date.now().toString();
	
	const hmac = Crypto.createHmac('SHA256', secretKey)
	const stringToSign = method + space + url + newLine + timestamp + newLine + accessKey
	const signature = hmac.update(stringToSign).digest('base64');

	request({
		method: method,
		json: true,
		uri:`https://sens.apigw.ntruss.com/sms/v2/services/${serviceId}/messages`,
		headers:{
			'Content-Type': 'application/json; charset=utf-8',
			'x-ncp-apigw-timestamp': timestamp,
			'x-ncp-iam-access-key': accessKey,
			'x-ncp-apigw-signature-v2': signature
		},
		body:{
			'type':'SMS',
			'from': sendingNumber,
			'content': `반가워요 행!이에요\n인증번호는 ${authNumber}입니다!`,
			'messages':[{'to':phoneNumber}],
		},

	}, (err, response, body) => {
		if (err) {
			console.error(err)
			next(err)
		}
	})
}

export default NC_SMS
// 인자, 콜백의 next, req.phoneNumber
