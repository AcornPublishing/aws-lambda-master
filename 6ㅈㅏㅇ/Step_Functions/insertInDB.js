'use strict';
console.log('InsertInDB 함수 준비');
let doc = require('dynamodb-doc');
let dynamo = new doc.DynamoDB();
const tableName = process.env.TABLE_NAME;

exports.handler = function(event, context, callback) {
  console.log('수신 이벤트 :', JSON.stringify(event, null, 2));
  console.log("DynamoDB 테이블에 삽입");

  let item = {
    "calcAnswer": event.c,
    "operand1": event.a,
    "operand2": event.b,
    "operator": event.op
  };

  let params = {
    "TableName": tableName,
    "Item": item
  };

  dynamo.putItem(params, (err, data) => {
    if (err) {
      console.log("DB 삽입 실패 : ", err);
      callback(err);
    } else {
      console.log("DB 삽입 성공");
      callback(null, "성공!");
    }
  });
};
