'use strict';

const weather = require('openweather-apis');
const AWS = require('aws-sdk');
const sns = new AWS.SNS({
  apiVersion: '2010-03-31'
});
const kmsEncryptedAPIKey = process.env.kmsEncryptedAPIKey;
const snsTopicARN = process.env.snsTopicARN;
let language = process.env.language;
let units = process.env.units;
let apiKey;

function processEvent(event, callback) {
  let city = event.city;
  weather.setAPPID(apiKey);
  weather.setLang(language);
  weather.setUnits(units);
  weather.setCity(city);

  weather.getSmartJSON(function(err, smart) {
    if (err) {
      console.log("발생한 오류 : ", err);
      callback(err);
    } else {
      if (Number(smart.temp) > 25) {
        console.log("섭씨 25도 이상!!");
        let snsParams = {
          Message: "무척 뜨거운 날씨! 날씨 정보 : " + JSON.stringify(smart),
          Subject: '날씨 정보',
          TopicArn: snsTopicARN
        };
        sns.publish(snsParams, function(snsErr, data) {
          if (snsErr) {
            console.log("SNS 알림 전송 실패 : " +
              snsErr, snsErr.stack); // 발생한 오류
            callback(snsErr);
          } else {
            console.log("SNS 알림 전송 성공 : ",
              snsParams.Message); // 성공 응답
            callback(null, "완료");
          }
        });
      } else {
        console.log("날씨 정보 : ", smart);
        callback(null, "완료");
      }
    }
  });
}

exports.handler = function(event, context, callback) {
  //var weatherEvent = JSON.parse(event);
  console.log('수신한 이벤트 :', event);

  if (apiKey) {
    // 컨테이너 재사용, 단순히 메모리에 있는 키로 이벤트를 처리한다.
    processEvent(event, callback);
  } else if (kmsEncryptedAPIKey &&
    kmsEncryptedAPIKey !== '<kmsEncryptedAPIKey>') {
    const encryptedBuf = new Buffer(kmsEncryptedAPIKey, 'base64');
    const cipherText = {
      CiphertextBlob: encryptedBuf
    };
    const kms = new AWS.KMS();
    kms.decrypt(cipherText, (err, data) => {
      if (err) {
        console.log('복호화 오류 :', err);
        return callback(err);
      }
      apiKey = data.Plaintext.toString('ascii');
      processEvent(event, callback);
    });
  } else {
    callback('API Key가 설정되지 않았음.');
  }
};
