'use strict';

const bunyan = require('bunyan');
const Bunyan2Loggly = require('bunyan-loggly');
const AWS = require('aws-sdk');
const kms = new AWS.KMS({
  apiVersion: '2014-11-01'
});
const decryptParams = {
  CiphertextBlob: new Buffer(process.env.kmsEncryptedCustomerToken, 'base64'),
};

let customerToken;
let log;

exports.handler = (event, context, callback) => {
  kms.decrypt(decryptParams, (error, data) => {
    if (error) {
      console.log(error);
      return callback(error);
    } else {
      customerToken = data.Plaintext.toString('ascii');
      log = bunyan.createLogger({
        name: 'mylogglylog',
        streams: [{
          type: 'raw',
          stream: new Bunyan2Loggly({
            token: customerToken,
            subdomain: process.env.logglySubDomain,
            json: true
          })
        }]
      });
      log.info("Loggly에 전송하는 첫 번째 로그!!!");
      return callback(null, "Loggly에 모든 이벤트 전송!");
    }
  });
};
