'use strict';
console.log('뺄셈 함수 준비');

exports.handler = function(event, context, callback) {
  console.log('수신 이벤트 :', JSON.stringify(event, null, 2));
  let operand1 = event.a;
  let operand2 = event.b;
  let operator = event.op;

  let res = {};
  res.a = Number(operand1);
  res.b = Number(operand2);
  res.op = operator;

  res.c = res.a - res.b;
  console.log("결과 : " + res.c);
  callback(null, res);
};
