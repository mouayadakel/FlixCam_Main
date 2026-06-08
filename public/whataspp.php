<?php
$target = "https://flixcam.tgi.com.sa/twilio/callback";

header("HTTP/1.1 307 Temporary Redirect");
header("Location: $target");
exit;
?>