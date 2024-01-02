<?php

header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: *");

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require '/home/customer/www/mynetcalendar.org/public_html/vendor/autoload.php';

$mail = new PHPMailer(true);
// $mail->SMTPDebug = 1;          
$email1 = $_POST['email1'];
$email2 = $_POST['email2'];
//$subject = $_POST['subject'];
// $attachment = $_POST['attachment'];    
// $link = $_POST['link'];
// $linkText = $_POST['linkText'];
$content = $_POST['content'];
$idFile = $_POST['idFile'];
$result = [];

try {

    //    $mail->SMTPDebug = SMTP::DEBUG_SERVER;
    $mail->isSMTP();                                      // Set mailer to use SMTP
    $mail->Host = 'mynetcalendar.org';  // Specify main and backup SMTP servers
    $mail->SMTPAuth = true;                               // Enable SMTP authentication
    $mail->Username = "milwaukee@mynetcalendar.org";                 // SMTP username
    $mail->Password = 'cal.1928';                           // SMTP password
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;                            // Enable TLS encryption, `ssl` also accepted
    $mail->Port = 465;
    $mail->Encoding = PHPMailer::ENCODING_7BIT;                            // TCP port to connect to
    $mail->setFrom("milwaukee@mynetcalendar.org", 'MyNetCal');
    $mail->isHTML(true);                                  // Set email format to HTML
    $mail->Subject = 'IMPORTANT: Incident Report';

    $mail->Body = $content;
    $mail->clearAddresses();
    //    $mail->addAddress("2103177915@tmomail.net");
    //    $mail->addAddress("3039296084@vtext.com");
    $mail->addAddress($email1);
    $mail->addAddress($email2);
    // $mail->addAttachment($attachment);     
    // $mail -> addStringAttachment($attachment, 'Activity.pdf')
    $file = $_FILES['file']['tmp_name'];
    $mail->addAttachment($file, "$idFile.pdf");
    $mail->send();
    $result['success'] = true;
    $result['message'] = "Email sent";
} catch (Exception $e) {
    $result['success'] = false;
    $result['message'] = "Email could not be sent. Mailer Error: {$mail->ErrorInfo}";
}

echo json_encode($result);
