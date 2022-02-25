'use strict';
console.log('계산기 함수 준비');

function InvalidInputError(message) {
  this.name = "InvalidInputError";
  this.message = message;
}

function InvalidOperandError(message) {
  this.name = "InvalidOperandError";
  this.message = message;
}

exports.handler = function(event, context, callback) {
  console.log('수신 이벤트:', JSON.stringify(event, null, 2));
  let operand1 = event.operand1;
  let operand2 = event.operand2;
  let operator = event.operator;

  InvalidInputError.prototype = new Error();
  if (operand1 === undefined || operand2 === undefined || operator === undefined) {
    console.log("유효하지 않은 입력");
    const invalidInputError =
      new InvalidInputError("유효하지 않은 입력!");
    return callback(invalidInputError);
  }

  let res = {};
  res.a = Number(operand1);
  res.b = Number(operand2);
  res.op = operator;
  InvalidOperandError.prototype = new Error();

  if (isNaN(operand1) || isNaN(operand2)) {
    console.log("유효하지 않은 연산자");
    const invalidOperandError =
      new InvalidOperandError("유효하지 않은 연산자!");
    return callback(invalidOperandError);
  }

  callback(null, res);
};
