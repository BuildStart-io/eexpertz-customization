SELECT cron.unschedule('drain-message-queue-eexpertz');
SELECT cron.unschedule('send-followups-eexpertz');

SELECT cron.schedule(
  'drain-message-queue-eexpertz',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'http://api-gw:8000/functions/v1/process-message-eexpertz',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODY0NDc4NjYsImV4cCI6MjEwMTgwNzg2Nn0.X3SLU9ShCNBzlwY91D1CVoHsLHOfYOv6R6eJ8UpkhsQ"}'::jsonb,
    body    := '{"trigger":"cron"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'send-followups-eexpertz',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url     := 'http://api-gw:8000/functions/v1/send-followups-eexpertz',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODY0NDc4NjYsImV4cCI6MjEwMTgwNzg2Nn0.X3SLU9ShCNBzlwY91D1CVoHsLHOfYOv6R6eJ8UpkhsQ"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
