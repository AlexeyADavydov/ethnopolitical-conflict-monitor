<?php
header('Content-Type: text/html; charset=utf-8');

echo iconv('windows-1251', 'UTF-8', file_get_contents('data/'.$_GET['file']));
