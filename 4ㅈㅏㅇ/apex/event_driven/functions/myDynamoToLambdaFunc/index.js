'use strict';
console.log('함수 준비');

function isValidIPAddress(ipAddr, cb) {
  if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipAddr)) {
    cb(null, "유효한 IPv4 주소");
  } else {
    cb("Invalid");
  }
}

function deleteItem(deleteParams, deleteCB) {
  var AWS = require('aws-sdk');
  AWS.config.update({
    region: "us-east-1",
    endpoint: "http://dynamodb.us-east-1.amazonaws.com"
  });
  var dynamodb = new AWS.DynamoDB({
    apiVersion: '2012-08-10'
  });
  dynamodb.deleteItem(deleteParams, function(err, data) {
    if (err) {
      deleteCB(err);
    } else {
      deleteCB(null, data);
    }
  });
}

exports.handler = (event, context, callback) => {
  var ipAddr;
  var eventName;
  var tableName = "LambdaTriggerDB";

  event.Records.forEach((record) => {
    eventName = record.eventName;
    console.log("Event: " + eventName);

    switch (eventName) {
      case "MODIFY":
      case "INSERT":
        ipAddr = record.dynamodb.Keys.IP_ADDRESS.S;
        // 인스턴스 태그를 DB의 같은 key column 값으로 추가한다.
        console.log("The IP Address entered is: " + ipAddr);

        // IP 주소가 유효한지 확인한다.
        isValidIPAddress(ipAddr, function(err, result) {
          if (err === "Invalid") {
            console.log("IP 주소가 유효하지 않음! DB의 열을 삭제해야 한다.");

            // 아이템을 삭제하는 함수를 호출한다.
            var deleteParams = {
              Key: {
                "IP_ADDRESS": {
                  S: ipAddr
                }
              },
              TableName: tableName
            };
            deleteItem(deleteParams, function(err, data) {
              if (err) {
                console.log("테이블 아이템 삭제 실패 :", err);
                return callback(err);
              } else {
                console.log("테이블 아이템 삭제 성공");
              }
            });
          } else {
            console.log("IP 주소 : " + result);
          }
        });

        break;

      case "REMOVE":
        console.log("MODIFY/REMOVE 동작 외에는 아무것도 하지 않는다.");
        break;
      default:
        console.log("예상치 못한 오류 발생!");
    }
  });
  callback(null, "아이템 처리 완료");
};
