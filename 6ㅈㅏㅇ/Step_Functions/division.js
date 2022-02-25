'use strict';
console.log('나눗셈 함수 준비');

function ZeroDivisorError(message) {
  this.name = "ZeroDivisorError";
  this.message = message;
}

exports.handler = function(event, context, callback) {
  console.log('수신 이벤트 :', JSON.stringify(event, null, 2));
  let operand1 = event.a;
  let operand2 = event.b;
  let operator = event.op;

  let res = {};
  res.a = Number(operand1);
  res.b = Number(operand2);
  res.op = operator;

  if (res.b === 0) {
    console.log("나눗셈 제수는 0이 될 수 없다.");
    const zeroDivisortError = new ZeroDivisorError("나눗셈 제수는 0이 될 수 없다!");
    callback(zeroDivisortError);
  } else {
    res.c = res.a / res.b;
    console.log("결과 : " + res.c);
    callback(null, res);
  }
};
