UPDATE public.notification_logs
SET error_message = REPLACE(error_message, '161.97.169.64', '45.88.191.92')
WHERE error_message LIKE '%161.97.169.64%';