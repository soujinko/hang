// Load the AWS SDK for Node.js
import AWS from 'aws-sdk';
// Set region
AWS.config.update({region: 'ap-northeast-1'}); //도쿄 리전을 사용함

// Create publish parameters
var params = {
  Message: 'aws테스트입니다: 그림자 디자이너의 저주', /* required */
  PhoneNumber: '821090659080',
};

// Create promise and SNS service object
var publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(params).promise();

// Handle promise's fulfilled/rejected states
publishTextPromise.then(
  function(data) {
    console.log(data);
  }).catch(
    function(err) {
    console.error(err, err.stack);
  });