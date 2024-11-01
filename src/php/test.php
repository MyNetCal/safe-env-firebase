<?php
use Twilio\Rest\Client;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;
require '/home/customer/www/mynetcalendar.org/public_html/vendor/autoload.php';

$type = $_POST["type"];
$user = $_POST["user"];

$name = $user["name"];
$phone = '+1' . $user["phone"];
$provider = $user["provider"];
$center = $user["password"];
$initials = $user["initials"];
$email = $user["email"];


function sendEmail() {
    global $name, $center, $initials, $email;
    $mail = new PHPMailer(true);
    //$mail->SMTPDebug = 2;                               // Enable verbose debug output

    $mail->isSMTP();                                      // Set mailer to use SMTP
    $mail->Host = 'mynetcalendar.org';  // Specify main and backup SMTP servers
    $mail->SMTPAuth = true;                               // Enable SMTP authentication
    $mail->Username = "info@mynetcalendar.org";                 // SMTP username
    $mail->Password = 'cal.1928';                           // SMTP password
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;                            // Enable TLS encryption, `ssl` also accepted
    $mail->Port = 465;                                    // TCP port to connect to
    $mail->setFrom("info@mynetcalendar.org", 'Meal Count App');
                                // Set email format to HTML
    $mail->Subject = "$center Meal Count";                             // TCP port to connect to

    $mail->Body="$name,<br>
        <br>
        You are invited to use the $center Meal Count App!<br>
        <br>
        To use the app and fill out your meal count just visit:<br>
        centers.mynetcalendar.org<br>
        <br>
        Your credentials are:<br>
        User: $initials<br>
        Password: $center";
    
    $mail->isHTML(false);   
    $mail->addAddress($email, "$name");
    $mail->send();
}

function sendText() {
    global $name, $phone, $center, $initials;

    $account_sid = 'AC4aa1646db8931fb5dfc951dfb15351b1';
    $auth_token = '4009f1aa1765dc8198048d1a47dec964';
    $twilio_number = "+12622284945";
    $client = new Client($account_sid, $auth_token);

    $body="$name,
        You are invited to use the $center Meal Count App!
        To use the app and fill out your meal count just visit:
        centers.mynetcalendar.org
        Your credentials are:
        User: $initials
        Password: $center";

    $client->messages->create(
        $phone,
        array(
            'from' => $twilio_number,
            'body' => $body
        )
    );
}

if ($type=="text") {
    sendText();
} else {
    sendEmail();
}

