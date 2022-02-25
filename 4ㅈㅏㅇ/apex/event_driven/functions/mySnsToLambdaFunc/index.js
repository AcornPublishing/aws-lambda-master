/*
  트리거된 Lambda 함수는 SNS 주제의 메시지 페이로드를 읽어 주어진 사용자 이름을 MD5 체크섬으로 만들고, MD5 체크섬의 처음 10자를 DynamoDB 테이블에 기록한다.
*/
'use strict';
console.log('함수 준비');

function getMessageHash(message, hashCB) {
  if (message === "") {
    return hashCB("빈 메시지");
  } else if ((message === null) || (message === undefined)) {
    return hashCB("메시지 값이 없음! null 또는 undefined");
  } else {
    var crypto = require('crypto');
    var messageHash = crypto.createHash('md5').update(message).digest("hex");
    return hashCB(null, messageHash.slice(0, 10));
  }
}

function insertItem(insertParams, insertCB) {
  var AWS = require('aws-sdk');
  AWS.config.update({
    region: "us-east-1",
    endpoint: "http://dynamodb.us-east-1.amazonaws.com"
  });
  var dynamodb = new AWS.DynamoDB({
    apiVersion: '2012-08-10'
  });
  dynamodb.putItem(insertParams, function(err, data) {
    if (err) {
      insertCB(err);
    } else {
      insertCB(null, data);
    }
  });
}

exports.handler = (event, context, callback) => {
  var tableName = "LambdaTriggerSNS";
  var message, recordVal;

  event.Records.forEach((record) => {
    message = record.Sns.Message;
    console.log("SNS 토픽에서 수신한 메시지 : " + message);

    console.log("메시지를 md5 해시로 만들어 처음 10자를 가져온다.");
    getMessageHash(message, function(hashErr, hashData) {
      if (hashErr) {
        console.log(hashErr);
        return callback(hashErr);
      } else {
        console.log("md5 해시의 처음 10자 : " + hashData);
        recordVal = hashData;
        console.log(tableName + " 테이블에 삽입한다.");
        var insertParams = {
          Item: {
            "userName": {
              S: recordVal
            }
          },
          TableName: tableName
        };
        insertItem(insertParams, function(insertErr, insertData) {
          if (insertErr) {
            console.log("DB에 삽입 불가. 발생된 오류 : ", insertErr);
            return callback(insertErr);
          } else {
            console.log("DB에 삽입 성공.");
            return callback(null, "성공");
          }
        });
      }
    });
  });
};
