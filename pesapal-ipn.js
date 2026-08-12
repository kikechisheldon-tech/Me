// PesaPal calls this URL when a payment's status changes. It just needs to
// acknowledge receipt in the format PesaPal expects.
exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderNotificationType: params.OrderNotificationType || 'IPNCHANGE',
      orderTrackingId: params.OrderTrackingId || '',
      orderMerchantReference: params.OrderMerchantReference || '',
      status: 200
    })
  };
};
