// 음식 이름 및 설명
'use strict';
console.log('함수 준비');
let doc = require('dynamodb-doc');
let dynamo = new doc.DynamoDB();
const uuidv4 = require('uuid/v4');
const tableName = process.env.TABLE_NAME;
const createResponse = (statusCode, body) => {
  return {
    "statusCode": statusCode,
    "body": body || ""
  }
};
let response;

module.exports.handler = function(event, context, callback) {
  console.log('수신 이벤트 :', JSON.stringify(event, null, 2));
  let name = event.pathParameters.name;
  let description = event.pathParameters.description;
  console.log("DynamoDB 삽입!");

  let item = {
    "id": uuidv4(),
    "name": name,
    "description": description
  };

  let params = {
    "TableName": tableName,
    "Item": item
  };

  dynamo.putItem(params, (err, data) => {
    if (err) {
      console.log("DB 삽입 실패 : ", err);
      response = createResponse(500, err);
    } else {
      console.log("DB 삽입 성공");
      response = createResponse(200, JSON.stringify(params));
    }
    callback(null, response);
  });
};
