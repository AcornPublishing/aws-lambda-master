'use strict';
let content = `
<\!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>404 - Not Found</title>
  </head>
  <body>
    <p>현재 페이지가 응답할 수 없습니다. 잠시 후 다시 시도하세요.</p>
  </body>
</html>
`;

exports.handler = (event, context, callback) => {
  const response = {
    status: '404',
    statusDescription: 'Not Found',
    headers: {
      'cache-control': [{
        key: 'Cache-Control',
        value: 'max-age=100'
      }],
      'content-type': [{
        key: 'Content-Type',
        value: 'text/html'
      }],
      'content-encoding': [{
        key: 'Content-Encoding',
        value: 'UTF-8'
      }],
    },
    body: content,
  };
  callback(null, response);
};
