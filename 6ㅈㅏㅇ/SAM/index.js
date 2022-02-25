'use strict';
console.log('계산기 함수 준비');
let doc = require('dynamodb-doc');
let dynamo = new doc.DynamoDB();
const tableName = process.env.TABLE_NAME;
const createResponse = (statusCode, body) => {
  return {
    "statusCode": statusCode,
    "body": body || ""
  }
};
let response;

exports.handler = function(event, context, callback) {
  console.log('수신 이벤트 :', JSON.stringify(event, null, 2));
  let operand1 = event.pathParameters.operand1;
  let operand2 = event.pathParameters.operand2;
  let operator = event.pathParameters.operator;

  if (operand1 === undefined || operand2 === undefined || operator === undefined) {
    console.log("유효하지 않은 입력(400)");
    response = createResponse(400, "유효하지 않은 입력(400)");
    return callback(null, response);
  }

  let res = {};
  res.a = Number(operand1);
  res.b = Number(operand2);
  res.op = operator;

  if (isNaN(operand1) || isNaN(operand2)) {
    console.log("유효하지 않은 연산자(400)");
    response = createResponse(400, "유효하지 않은 연산자(400)");
    return callback(null, response);
  }

  switch (operator) {
    case "add":
      res.c = res.a + res.b;
      break;
    case "sub":
      res.c = res.a - res.b;
      break;
    case "mul":
      res.c = res.a * res.b;
      break;
    case "div":
      if (res.b === 0) {
        console.log("나눗셈 제수는 0이 될 수 없다.");
        response = createResponse(400, "나눗셈 제수는 0이 될 수 없다.(400)");
        return callback(null, response);
      } else {
        res.c = res.a / res.b;
      }
      break;
    default:
      console.log("유효하지 않은 연산자(400)");
      response = createResponse(400, "유효하지 않은 연산자(400)");
      return callback(null, response);
      break;
  }
  console.log("결과 : " + res.c);
  console.log("DynamoDB에 삽입");

  let item = {
    "calcAnswer": res.c,
    "operand1": res.a,
    "operand2": res.b,
    "operator": res.op
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
      response = createResponse(200, JSON.stringify(res));
    }
    callback(null, response);
  });
};
