<?php
	$titles = json_decode(file_get_contents('js/titles.json'));

	$allFiles = scandir('data', 1);
	$years = array();

	$pref = 'conflict_db_data_';

	foreach ($allFiles as $file) {
		if (strpos($file, $pref) !== false) {
			$split = explode('_data_', basename($file, '.csv'));
			$years[] = $split[1];
		}
	}
?>

<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title><?=$titles->title;?></title>
  <meta name="viewport" content="width=device-width, initial-scale=1">

	<link href="https://fonts.googleapis.com/css?family=Play" rel="stylesheet">
	<link href="https://fonts.googleapis.com/css?family=Open+Sans:400,600i" rel="stylesheet">
	<link rel="icon" type="image/png" href="img/favicon.png">

  <link rel="stylesheet" href="css/normalize.css">
  <link rel="stylesheet" href="css/skeleton.css">
  <link rel="stylesheet" href="css/style.css">

  <script src="js/d3.v4.min.js"></script>
  <script src="js/topojson.v1.min.js"></script>
  <script src="js/w3color.js"></script>
  <script src="js/script.js"></script>
</head>

<body>

<div class="container">
	<div class="row">
		<h4><?=$titles->title;?></h4>
		<p><?=$titles->subtitle;?></p>
		<div id="container"></div>
	</div>

	<div class="row">
		<div class="four columns">
			<h5>Фильтры</h5>
			<label class="label-year" for="year">Год</label>
			<select id="year" class="u-full-width" onchange="yearChanged()">
				<?php foreach ($years as $year):?>
					<option value="<?=$year;?>"><?=$year;?></option>
				<?php endforeach;?>
			</select>

			<label for="category">Категория данных</label>
			<select id="category" class="u-full-width" onchange="categoryChanged()" autocomplete="off">
				<option value="1">Тип конфликта</option>
				<option value="2">Фактор конфликта</option>
				<option selected value="3">Интенсивность конфликта</option>
				<option value="4">Субъекты конфликта</option>
			</select>
		</div>
		<div class="eight columns">
			<h5>Легенда</h5>
			<div id="legend">
				<div class="six columns"></div>
				<div class="six columns"></div>
			</div>
		</div>
	</div>

	<div class="row">
		<h5>Справка</h5>
		<div id="help">
			<i>Название:</i> &nbsp;<span id="cName">—</span><br>
			<i>Территория:</i> &nbsp;<span id="ctName">—</span><br>
			<i>Стороны:</i> &nbsp;<span id="cSubject">—</span><br>
			<i>Тип:</i> &nbsp;<span id="cType">—</span><br>
			<i>Факторы:</i> &nbsp;<span id="cFactor">—</span><br>
			<i>Интенсивность:</i> &nbsp;<span id="cIntensity">—</span><br>
			<i>История:</i> &nbsp;<span id="cHistory">—</span><br>
			<i>Практики регулирования:</i> &nbsp;<span id="cPractice">—</span>
		</div>

		<span class="u-pull-left small">
			<span class="open-sans">©</span>
			<a target="_blank" href="http://www.imemo.ru/index.php?page_id=916">2017-<?=date("Y");?>, ИМЭМО РАН</a>
		</span>
		<span class="u-pull-right small">Все права защищены</span>
	</div>
</div>
<script>
	init('<?=$pref.$years[0];?>');
</script>
</body>
</html>