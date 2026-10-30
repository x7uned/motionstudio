# «Why mosquitoes buzz right in your ear»: фактчек

Kagenami, EN, ~55 с, продолжение «Why mosquitoes bite you first». Дата проверки: 2026-10-24.

**Как читались источники.** Сайт pmc.ncbi.nlm.nih.gov отдаёт роботам страницу проверки браузера, поэтому полные тексты PMC я брал через официальный API NCBI E-utilities (efetch, db=pmc: полнотекстовый XML). Ссылки ниже даны в обычном виде PMC/DOI.
Метки:
- **[полный текст]**: прочитан весь текст статьи;
- **[аннотация]**: прочитана только аннотация (PubMed, Crossref или страница журнала);
- **[вторично]**: факт взят из другой статьи, которая ссылается на источник; сам источник не открыт.

Цитаты оставлены на английском и короткие. Числа взяты только из открытых текстов. Если число получено моим расчётом, это помечено.

---

## Коротко

1. Самку ведёт **выдыхаемый CO₂**. Он запускает поиск и «включает» интерес к тёмным силуэтам. Вблизи добавляются тепло (ИК-излучение до ~70 см, конвекция меньше 10 см) и запах кожи. На каком расстоянии комар чувствует шлейф *человека*, **точно не измеряли**. «Несколько метров, до ~10 м» можно давать только как порядок величины.
2. **Голова как цель.** Это доказано для части видов: Aedes aegypti, Anopheles atroparvus, An. albimanus, An. quadriannulatus. У atroparvus и albimanus к голове тянет именно **дыхание**: если отвести выдох, доля укусов в голову падает примерно с 50 % до 20 %. Над спящим под пологом An. gambiae скапливаются над головой и грудью. ⚠ Малярийные Anopheles кусают в основном ноги, а у лежащего — места рядом с полом, **кроме головы**. Обычный домашний Culex кусает без предпочтения головы. Мысль «голова — единственное, что торчит из-под одеяла» логична, но **исследования спящих под одеялом я не нашёл**.
3. **Писк — это звук взмахов крыльев.** Высота тона равна частоте взмахов: у самок Aedes aegypti ~430–500 в секунду, у самок Culex pipiens ~400, у самцов ~640–800. ⚠ Крылья у комара **не короткие**: они длинные и узкие. Короткий у него *размах* взмаха, всего ~39°. Это рекорд среди зависающих в воздухе животных.
4. **Громкость.** Один комар очень тихий: рой из ~70 самцов дал всего ~20 дБ на расстоянии 0,9 м. Звук быстро слабеет с расстоянием, поэтому у самого уха он во много раз громче.
5. **«Песня любви».** Самец и самка подстраивают свои тона, пока не совпадут **обертоны** (у Ae. aegypti около 1200 Гц: 2-я гармоника самца ≈ 3-я гармоника самки). Самки тоже слышат. Песня предназначена комарам, а не нам. Данных, что писком ищут людей, нет.
6. **Тишина = села?** Без взмахов нет звука, это так. Но писк пропадает и тогда, когда она просто отлетела: звук очень быстро слабеет. Честная формулировка: «может значить, что она села».

---

## 1. Почему голова и ухо, и почему ночью

### 1.1 Дыхание (CO₂): что доказано

**van Breugel F., Riffell J., Fairhall A., Dickinson M.H. (2015).** Mosquitoes use vision to associate odor plumes with thermal targets. *Current Biology* 25(16): 2123–2129. DOI 10.1016/j.cub.2015.06.046. https://pmc.ncbi.nlm.nih.gov/articles/PMC4546539/ **[полный текст]** (Aedes aegypti, аэродинамическая труба, 3D-трекинг)
- Главный вывод: CO₂ не «включает» чувство тепла. Он включает **притяжение к зрительным объектам**: «the detection of CO2 actually activates a strong attraction to visual features».
- Расстояния:
  - Человек становится виден комару с **5–15 м**, в зависимости от освещения (ссылка на более раннюю работу).
  - Тепловой шлейф руки на **10–15 см** уже отличается от воздуха меньше чем на 0,2 °C. Это порог чувствительности Aedes, так что тепловой шлейф работает только совсем рядом.
  - При угловом разрешении глаза 4–8° руку видно с **30–50 см**, то есть втрое дальше, чем чувствуется тепло.
- Про дальность CO₂ авторы честно пишут, что шлейф человека «has not been precisely measured» (речь о том, с какого расстояния комар впервые его замечает). Для сравнения они приводят опыт, где CO₂ выпускали со скоростью 4 л/мин (как крупная корова): шлейф отличался от фона на **60 м**. Это физическая заметность шлейфа, а не реакция комара.
- Шлейф CO₂ на практике прерывистый, комары идут по нему зигзагами («cast and surge»). От выхода из шлейфа до объекта путь часто петляет (рис. 4G–H).

**Gillies M.T., Wilkes T.J. (1972).** The range of attraction of animal baits and carbon dioxide for mosquitoes. *Bull. Entomol. Res.* 61: 389–404. DOI 10.1017/S0007485300047295. https://www.cambridge.org/core/journals/bulletin-of-entomological-research/article/abs/range-of-attraction-of-animal-baits-and-carbon-dioxide-for-mosquitoes-studies-in-a-freshwater-area-of-west-africa/6AFE9DC3A11476D6D84B38CD803675AC **[аннотация]**
- Гамбия, ловушки через каждые 7,5 м до 60 м. На двух телят Anopheles ziemanni, Mansonia uniformis и Aedes реагировали с **22,5–30 м**. На CO₂ в том же количестве реакция была с **15 м**, но не дальше. Culex thalassius и C. univittatus реагировали только на 7,5 м.
- ⚠ Телята выдыхают намного больше CO₂, чем человек. Для человека эти числа следует считать верхней оценкой.

**Gillies M.T. (1980).** The role of carbon dioxide in host-finding by mosquitoes: a review. *Bull. Entomol. Res.* 70(4): 525–532. DOI 10.1017/S0007485300007811 **[аннотация]**
- Без движения воздуха CO₂ только **активирует** комара: найти по нему направление нельзя. Долгий полёт поддерживают **прерывистые импульсы** CO₂, а не ровная смесь. Вблизи CO₂ работает вместе с тёплыми влажными конвекционными потоками.
- ⚠ Для спальни это значит, что «нить» выдоха без сквозняка — слабый указатель направления. Остаются тёплый поток воздуха от тела и ИК.

**Dekker T., Geier M., Cardé R.T. (2005).** Carbon dioxide instantly sensitizes female yellow fever mosquitoes to human skin odours. *J. Exp. Biol.* 208: 2963–2972. DOI 10.1242/jeb.01736 **[аннотация]**
- CO₂ действовал и при разбавлении больше чем в 100 раз от концентрации выдоха. Короткая встреча с «нитью» CO₂ сразу повышает чувствительность к запаху кожи **минимум в 5 раз**.

**Dekker T., Cardé R.T. (2011).** Moment-to-moment flight manoeuvres of the female yellow fever mosquito… *J. Exp. Biol.* 214: 3480–3494. DOI 10.1242/jeb.055186 **[аннотация]**
- После встречи с CO₂ длиной **~0,03 с** комар делает рывок против ветра. Если CO₂ больше не попадается, он начинает петлять поперёк потока и снова и снова пересекает место, где чувствовал газ. Это полезно для п. 4: полёт «туда-сюда».

**Geier M., Bosch O.J., Boeckh J. (1999).** *J. Exp. Biol.* 202: 1639–1648. DOI 10.1242/jeb.202.12.1639 **[аннотация]**: чем сильнее колеблется концентрация CO₂ (турбулентный, нитевидный шлейф), тем больше Aedes летят против ветра.

**Lacey E.S., Cardé R.T. (2011).** Activation, orientation and landing of female *Culex quinquefasciatus* in response to CO₂ and odour from human feet. *Med. Vet. Entomol.* 25: 94–103. DOI 10.1111/j.1365-2915.2010.00921.x **[аннотация]**
- CO₂ ускорял активацию. Но почти не видно, чтобы самки **меняли курс** на входе в шлейф CO₂ или на выходе из него. ⚠ Домашний Culex следует за дыханием слабее, чем Aedes.

### 1.2 Тепло и ИК

**Chandel A.\*, DeBeaubien N.A.\*, … Montell C. (2024).** Thermal infrared directs host-seeking behaviour in *Aedes aegypti* mosquitoes. *Nature* 633: 615–623. DOI 10.1038/s41586-024-07848-5. https://pmc.ncbi.nlm.nih.gov/articles/PMC11410652/ **[полный текст, CC BY]**
- ⚠ Первый автор Chandel, DeBeaubien — равный первый автор. Ссылаться лучше как «Chandel, DeBeaubien et al. 2024».
- ИК от источника 34 °C (температура кожи) работает **до 70 см**: индекс предпочтения 0,47 на 30 см и 0,38 на 70 см, 0,15 на 80 см, 0,03 на 90 см (уже нет предпочтения). Источник был большой: 45,5 × 49 см.
- Конвекционное тепло от источника 34 °C чувствуется только **меньше чем на 10 см**.
- CO₂, летучие запахи и зрение работают дальше, «up to around 5–15 m» (сводка авторов).
- По одному сигналу (только CO₂, только ИК, только запах) поиска почти нет. Пара «запах + CO₂» дала индекс поиска 6,50 %, а с ИК — 12,93 %, то есть **вдвое больше**.
- 5 % CO₂ авторы называют «approximate concentration of exhaled breath».
- Ночной малярийный An. stephensi тоже предпочитал ИК-зону: индекс 0,96 при посадке.
- Датчик — канал TRPA1 на кончике антенны, ему помогают два опсина.

### 1.3 Голова: есть ли данные

**De Jong R., Knols B.G.J. (1995).** Selection of biting sites on man by two malaria mosquito species. *Experientia* 51: 80–84. DOI 10.1007/BF01964925. Я читал эту работу **полностью в расширенном виде**, как главу 2 диссертации Knols B.G.J. (1996) «Odour-mediated host-seeking behaviour of… *Anopheles gambiae*», Wageningen: https://edepot.wur.nl/210525 (PDF, с. 53–67).
- Условия: голый неподвижный мужчина сидит на табурете под пологом, свет меньше 20 лк. Каждый вид проверяли примерно на 100 укусах.
- Таблица 1, доля укусов в голову и шею (голова — это 9 % площади кожи):

| Вид | Голова + шея | Ноги | Значимость |
|---|---|---|---|
| Aedes aegypti (n = 105) | 24 (~23 %) | 26 | P < 0,001 |
| Culex quinquefasciatus (n = 101) | 13 (~13 %) | 30 | n.s. (случайно) |
| Anopheles atroparvus (n = 100) | 50 % | 18 % | P < 0,001 |
| An. gambiae s.s. (n = 100) | 1 % | 76 % | P < 0,001 |

- An. atroparvus у тела **резко сбавлял скорость, учуяв выдох, и разворачивался к голове**. Когда выдох отводили через клапан и трубку, укусов в голову стало **19 % вместо 50 %** (данные из главы 3, P < 0,001).
- ⚠ У **Aedes aegypti** предпочтение головы **не зависело от дыхания**: без выдоха картина та же. Это личное сообщение коллег в той же главе. Авторы предполагают, что дело в тепле, зрении или запахе кожи.
- ⚠ Culex quinquefasciatus кусал без предпочтений, и выдох на него не влиял.
- Любопытно: An. gambiae, которые кусают ноги, «often seen approaching the host in the head region», а потом спускались к ступням. Это наблюдение без подсчётов.

**Knols B.G.J., Takken W., De Jong R. (1994).** Influence of human breath on selection of biting sites by *Anopheles albimanus*. *J. Am. Mosq. Control Assoc.* 10: 423–426. Прочитано **полностью** как глава 3 той же диссертации (с. 69–77).
- Комары замедлялись, подлетая к лицу, «most likely upon entering the cone of exhaled breath». В голову приходилось до **5,4 раза** больше укусов, чем в среднем по коже, в основном **в лицо**.
- Без выдоха (дыхание в трубку, зажим на носу) укусов в голову стало **20 % вместо 49 %**.

**Dekker T. et al. (1998).** Selection of biting sites on a human host by *An. gambiae* s.s., *An. arabiensis* and *An. quadriannulatus*. *Entomol. Exp. Appl.* 87: 295–300. DOI 10.1046/j.1570-7458.1998.00334.x. https://research.wur.nl/en/publications/selection-of-biting-sites-on-a-human-host-by-anopheles-gambiae-ss **[аннотация]**
- Все три вида кусали сидящего в ноги. Когда человек лежал на полу с поднятыми ногами, ноги кусали **меньше**, чем то, что ближе к полу: голову, туловище, руки.
- An. quadriannulatus часто кусал голову. Авторы допускают, что это ответ на выдох.

**Braack L. et al. (2015).** Biting behaviour of African malaria vectors: 1. Where do the main vector species bite on the human body? *Parasites & Vectors* 8: 76. DOI 10.1186/s13071-015-0677-9. https://pmc.ncbi.nlm.nih.gov/articles/PMC4320538/ **[полный текст, CC BY]**
- Полевые отловы. У сидящих людей An. arabiensis, An. gambiae и An. funestus кусают голень, лодыжки и ступни в **77,3–100 %** случаев.
- У лежащих на земле укусы идут вдоль края тела, касающегося земли, **«excluding the head»** (n = 158 для arabiensis).
- Таблица 7 (сводка чужих данных, **[вторично]**): Aedes aegypti — «Head & shoulders», An. atroparvus — «Head & shoulders», An. albimanus — «Head & neck». Culex pipiens fatigans: 82 % укусов ниже колена у сидящих и 34 % у лежащих (Self et al. 1969). Culex quinquefasciatus — «Non-specific whole body».

**Lynd A., McCall P.J. (2013).** Clustering of host-seeking activity of *Anopheles gambiae* mosquitoes at the top surface of a human-baited bed net. *Malaria Journal* 12: 267. DOI 10.1186/1475-2875-12-267. https://pmc.ncbi.nlm.nih.gov/articles/PMC3733746/ **[полный текст, CC BY]**
- Под пологом лежит спящий человек, полог покрыт клеем. На верхнюю сторону полога пришлось **74–87 %** комаров. Около **70 %** из них — в квадрате 90 × 90 см (или меньше) **прямо над головой и грудью**. Без человека комары садились в основном на стенки.
- ⚠ Авторы пишут, что по этим данным нельзя сказать, какой сигнал главный (дыхание, тепло, пот): «it is impossible to draw conclusions as to which is the most important cue».

**Zuo C., Fei C., Cohen A., Kim S., Cardé R.T., Dunkel J., Hu D.L. (2026).** Predicting mosquito flight behavior using Bayesian dynamical systems learning. *Science Advances* 12(12): eadz7063. DOI 10.1126/sciadv.adz7063. https://pmc.ncbi.nlm.nih.gov/articles/PMC12998517/ **[полный текст]** (плюс пресс-релиз Georgia Tech: https://coe.gatech.edu/news/2026/03/why-mosquitoes-swarm-your-head-theyre-following-signals-not-each-other)
- 3D ИК-трекинг Ae. aegypti вокруг стоящего человека, больше 20 млн точек. Комары «primarily target the human head» и замедляются у головы. Авторы считают, что голова сочетает два сигнала: тёмный силуэт и CO₂.
- Модель «человека» — чёрная сфера, выпускающая CO₂ со скоростью **0,24 л/мин** («matching the rate of human breathing»). Вокруг неё комары **кружат** со скоростью около **0,5 м/с** («sustained orbiting behavior»).
- Во введении авторы, ссылаясь на других, пишут, что CO₂ запускает полёт к хозяину «up to distances of 10 m downwind».
- ⚠ Опыт шёл со светом и стоящим человеком в капюшоне, это не спальня. Вид — дневной Ae. aegypti.

### 1.4 Итог: что доказано, а что лишь разумно
- **Доказано:** выдох (CO₂) активирует поиск и делает зрение и запах важнее. У части видов он прямо тянет к лицу: опыты с отводом выдоха у atroparvus и albimanus. Aedes aegypti в лаборатории целится в голову. Над спящим под пологом An. gambiae держатся над головой и грудью.
- **Не доказано / зависит от вида:** что ночной «пищун» (часто Culex pipiens или quinquefasciatus) предпочитает голову. Данные Culex скорее против: случайное распределение или ноги. Малярийные Anopheles кусают ноги, а у лежащих — не голову.
- **Разумное объяснение, а не проверенный факт:** ночью из-под одеяла торчит голова. Выдох выходит там же, а сквозь одеяло нет ни ИК, ни запаха. Значит, комар оказывается у лица. Отдельного исследования «спящий под одеялом» я не нашёл.

**Можно сказать:** «Your breath tells her where you are.» «She follows your breath to your face.» «At night, your face is often the only part not under the blanket.» «Close up, she can feel your warmth.»
**Нельзя сказать:** «Mosquitoes always go for your head / ears» (зависит от вида). «They smell you from 50 m» (для человека не измерено). «They aim for your ear» (данных про уши нет). «Scientists proved they target sleepers' heads because of the blanket» (такого исследования нет).

---

## 2. Писк — это крылья

**Arthur B.J., Emr K.S., Wyttenbach R.A., Hoy R.R. (2014).** Mosquito (*Aedes aegypti*) flight tones: frequency, harmonicity, spherical spreading, and phase relationships. *J. Acoust. Soc. Am.* 135(2): 933–941. DOI 10.1121/1.4861233. https://pmc.ncbi.nlm.nih.gov/articles/PMC3985972/ **[аннотация]**; полный текст PMC/Europe PMC закрыт для робота (403).
- «Mosquito flight produces a tone as a side effect of wing movement». Этот же тон служит сигналом при ухаживании.
- Тон у самца выше, и он меняет его в более широком диапазоне.
- Первые **шесть гармоник** почти всегда в пределах 1 Гц от целых кратных основной частоты. Поэтому писк — не чистый тон, а «стопка» обертонов.
- Вдоль оси вперёд–назад амплитуда падала как **расстояние в степени 2,3**. Это ближнее поле: вблизи звук слабеет даже быстрее, чем по закону 1/r.

**Частоты взмахов (= высота основного тона)**

| Вид, пол | Частота | Источник |
|---|---|---|
| Aedes aegypti ♀, на привязи | 430,6 ± 10,8 Гц | Cator et al. 2009 [полный текст] |
| Aedes aegypti ♂, на привязи | 636,7 ± 15,1 Гц | там же |
| Ae. aegypti ♀, свободный полёт, 23 °C | 498,1 Гц (n = 509) | Kim et al. 2021 [полный текст] |
| Ae. aegypti, разброс по литературе | ♀ 330–544 Гц, ♂ 557–750 Гц | Clements 1999 по Cator & Harrington 2011 [вторично] |
| Culex pipiens ♀, 23 °C | 408,4 Гц (n = 568) | Kim et al. 2021 |
| Culex quinquefasciatus ♀, 23 °C | 456,2 Гц (n = 798) | Kim et al. 2021 |
| Cx. quinquefasciatus ♂, свободный полёт | **717 ± 59 Гц** | Bomphrey et al. 2017 [полный текст] |
| Anopheles coluzzii ♀ / ♂ | 487 Гц / 803 Гц | Feugère et al. 2021 [полный текст] |
| Aedes albopictus ♀ | 536,2 Гц | Kim et al. 2021 |

- Kim D., DeBriere T.J., Cherukumalli S., White G.S., Burkett-Cadena N.D. (2021). Infrared light sensors permit rapid recording of wingbeat frequency… *Scientific Reports* 11: 10042. DOI 10.1038/s41598-021-89644-z. https://pmc.ncbi.nlm.nih.gov/articles/PMC8113239/ (только самки, 29 видов).
  - ⚠ Частота **растёт с температурой**. Для того же Ae. aegypti в другой работе при 32,6 °C получили 664 Гц, на 28,6 % выше, чем 498 Гц при 23 °C.
- Cator et al. 2009 обобщают, что у разных видов основная частота «between 300-600 Hz depending on species».

**Bomphrey R.J., Nakata T., Phillips N., Walker S.M. (2017).** Smart wing rotation and trailing-edge vortices enable high frequency mosquito flight. *Nature* 544: 92–95. DOI 10.1038/nature21727. https://pmc.ncbi.nlm.nih.gov/articles/PMC5412966/ **[полный текст]**
- Самцы *Culex quinquefasciatus* в свободном полёте: **717 ± 59 Гц**, размах взмаха всего **39° ± 4°**, «by far the smallest amplitude yet measured for any hovering animal». В резюме статьи стоит общая фраза про комаров «>800 Hz».
- ⚠ **Исправление посылки брифа.** Крылья у комара **не короткие**: «long, slender wings», «high-aspect ratio». Короткий у него *ход* крыла. Простыми словами: «Her wings are long and thin, but each beat is tiny and very fast.»
- Зачем такая частота, неясно. Авторы осторожно предполагают: «perhaps in the domain of acoustic communication».

### Почему громче всего у уха

**Feugère L., Gibson G., Manoukis N.C., Roux O. (2021).** Mosquito sound communication: are male swarms loud enough to attract females? *J. R. Soc. Interface* 18: 20210121. DOI 10.1098/rsif.2021.0121. https://pmc.ncbi.nlm.nih.gov/articles/PMC8086941/ **[полный текст]**
- Рой из примерно **70 самцов** An. coluzzii дал всего **20 ± 3 дБ SPL на 0,9 м**. Это очень тихо: рой целиком тише шёпота.
- По оценке авторов, чтобы другой комар услышал источник дальше ~0,1 м, нужен источник мощнее одного комара. Большие рои при этом «easily discernible to the human ear a few metres away» (ссылка на Wesenberg-Lund 1920).
- Пересчёт громкости с расстоянием у авторов идёт по сферическому закону (−20·log10 расстояния), то есть **−6 дБ при каждом удвоении расстояния**.
- **Мой расчёт (⚠ не измерение):** если 70 одинаковых комаров звучат несогласованно, один из них примерно на 10·log10(70) ≈ 18 дБ тише роя. Получается ~2 дБ на 0,9 м, почти на пороге слышимости. С 1 м до 1 см у уха комар в 100 раз ближе, это **+40 дБ** по закону 1/r, а в ближнем поле ещё больше (Arthur 2014: степень 2,3).
- **Прямого измерения громкости одной самки у человеческого уха я не нашёл.**

**Можно сказать:** «The whine is the sound of her wings.» «She beats her wings about 400 to 500 times a second. That is the note you hear.» «Her wings are long and thin, but each beat is tiny.» «A mosquito is very quiet. You hear her only when she is very close.»
**Нельзя сказать:** «exactly 500 beats» как общее число для всех комаров. «Mosquitoes have short wings». Конкретные «дБ у уха», их никто не мерил. «She buzzes louder to scare/find you».

---

## 3. «Песня любви»

**Cator L.J., Arthur B.J., Harrington L.C., Hoy R.R. (2009).** Harmonic convergence in the love songs of the dengue vector mosquito. *Science* 323(5917): 1077–1079. DOI 10.1126/science.1166541. https://pmc.ncbi.nlm.nih.gov/articles/PMC2847473/ **[полный текст авторской рукописи]**
- ⚠ Четвёртый автор — **Ronald R. Hoy**, а не Ellis (в брифе ошибка).
- Аннотация: «The familiar buzz of flying mosquitoes is an important mating signal». Совпадение идёт не на основных частотах, ~400 Гц у самки и ~600 Гц у самца, а на **общей гармонике ~1200 Гц**.
- Числа из текста. Самку подносили к самцу в пределах его «зоны слышимости» **2 см** на 10 секунд. В **14 из 21 пары (67 %)** оба меняли тон, пока **2-я гармоника самца** (F0 636,7 ± 15,1 Гц, гармоника 1238,3 ± 31,0 Гц) не совпала с **3-й гармоникой самки** (F0 430,6 ± 10,8 Гц, гармоника 1356,2 ± 29,2 Гц). Совпадение держалось в среднем **9,71 ± 1,05 с** на частоте **1354,5 ± 31,5 Гц**. ⚠ Округлённое «1200 Гц» взято из аннотации, а измеренная общая частота у них ближе к 1350 Гц. В ролике лучше говорить «a higher note» без числа.
- Комары, которых лишили слуха, и комары в тишине тон не меняли. Значит, они подстраиваются **по звуку**.
- **Самки слышат.** Орган Джонстона (в основании антенны) у обоих полов отвечал на тоны **125–2000 Гц**. Авторы называют это первым прямым доказательством, что самки не глухи.
- Неоплодотворённые самки подстраивались к записи самца в 6 из 20 случаев (30 %). Уже спарившиеся — в 2 из 18 (11 %).
- Самцы подстраивались даже к одному чистому тону 1200 Гц (12 из 54, 22 %).

**Gibson G., Russell I.J. (2006).** Flying in tune: sexual recognition in mosquitoes. *Current Biology* 16(13): 1311–1316. DOI 10.1016/j.cub.2006.05.053 **[аннотация, PubMed 16824918]**
- *Toxorhynchites brevipalpis* (не кровосос). Оба пола меняют частоту взмахов в ответ на чистые тоны, самцы чувствительнее. В разнополой паре частоты сближаются **«within seconds»**, а в однополой сначала сходятся, потом резко расходятся. По Cator 2009 частоты взмахов у этого вида 300–500 Гц.
- Продолжение: Gibson, Warren, Russell (2010), *JARO* 11: 527–540, DOI 10.1007/s10162-010-0243-2 **[аннотация]**. Пары сходятся на общей гармонике выше «рабочего» диапазона органа Джонстона. Подсказкой служат **разностные тона** (искажения в колебаниях антенны).

**Warren B., Gibson G., Russell I.J. (2009).** *Curr. Biol.* 19: 485–491. DOI 10.1016/j.cub.2009.01.059 **[аннотация]**: у *Culex quinquefasciatus* то же самое, обычно совпадают 3-я гармоника самки и 2-я самца.
**Pennetier C. et al. (2010).** *Curr. Biol.* 20: 131–136. DOI 10.1016/j.cub.2009.11.040 **[аннотация]**: у *An. gambiae* подстройка надёжнее идёт внутри одной молекулярной формы (p = 0,001). Это может помогать узнавать «своих».

**«Сексуальные сыновья».** ⚠ Это работа **Cator L.J., Harrington L.C. (2011)**, а не Cator et al. 2010: The harmonic convergence of fathers predicts the mating success of sons in *Aedes aegypti*. *Animal Behaviour* 82(4): 627–633. DOI 10.1016/j.anbehav.2011.07.013. https://pmc.ncbi.nlm.nih.gov/articles/PMC3190198/ **[полный текст]**
- Сыновья пар, которые сошлись по тону перед спариванием, чаще спаривались в конкуренции и сами чаще сходились по тону. Вывод авторов: сигнал может нести наследуемую информацию о качестве самца.
- Отдельная работа Cator, Ng'Habi, Hoy, Harrington (2010), *Behavioral Ecology*, DOI 10.1093/beheco/arq087, — о другом: размер тела и звук у An. gambiae. Видел только метаданные Crossref.
- Там же важная деталь для п. 4: у Ae. aegypti брачные рои **собираются вокруг хозяина**, то есть обычно человека: «mating occurs in aerial swarms, which form around the blood-meal host» (по Hartberg 1971, **[вторично]**).

**Оговорки к «песне»:**
- Aldersley A., Champneys A., Homer M., Robert D. (2016). *J. R. Soc. Interface* 13: 20151007. DOI 10.1098/rsif.2015.1007 **[аннотация]**. Совпадение активное, а не случайное, но идёт на **большем наборе сочетаний гармоник**, чем думали. Оно бывает и у пар одного пола, и в ответ на запись. Нужно участие обоих.
- Aldersley A., Cator L.J. (2019). *Sci. Rep.* 9: 2145. DOI 10.1038/s41598-019-38599-3 **[аннотация]**. Совпадение чаще видно в **успешных** попытках спаривания, вместе с переходом к стабильному парному полёту. Самки отталкивают самцов ногами («kicks»).

**Уши.** Su M.P., Andrés M., Boyd-Gibbins N., Somers J., Albert J.T. (2018). Sex and species specific hearing mechanisms in mosquito flagellar ears. *Nat. Commun.* 9: 3911. DOI 10.1038/s41467-018-06388-7. https://pmc.ncbi.nlm.nih.gov/articles/PMC6156513/ **[полный текст]**
- У самцов в органе Джонстона **больше 15 000 нейронов**, это крупнейший такой орган у насекомых. У самок примерно **вдвое меньше**.
- Пушистые волоски на антеннах самцов (fibrillae) у Ae. aegypti и Cx. quinquefasciatus стоят постоянно, а у An. gambiae поднимаются только в часы роения.

**Menda G., … Hoy R.R. (2019).** The long and short of hearing in the mosquito *Aedes aegypti*. *Curr. Biol.* 29: 709–714. DOI 10.1016/j.cub.2019.01.026 **[аннотация]**
- Самцы слышат тон самки (в воспроизведении) с **нескольких метров, до 10 м**, и взлетают на этот звук. Ухо чувствует звук от **31 дБ SPL**.

**Можно сказать:** «Her song is not for you. It is for males.» «When a male and a female meet, they change their notes until they match.» «Females can hear too.» «The male hears with his fluffy antennae.»
**Нельзя сказать:** «They sing the same note» (совпадают обертоны, а не основные тоны). «Females are deaf». «It happens in a split second» (держится ~10 с, подстройка «за секунды»). «Scientists proved she sings to attract males to you» (рой у хозяина известен только у Ae. aegypti).

---

## 4. Слышат ли они нас, и откуда «то есть, то нет»

- **Писк не адресован людям.** Тон — побочный продукт полёта (Arthur 2014), и он же — брачный сигнал (Cator 2009). Данных, что кровососущие комары находят людей по звуку или пищат «для нас», я **не нашёл**.
  - Исключение — комары, которые кусают лягушек: *Culex territans* летит на кваканье (Bartlett-Healy, Crans, Gaugler 2008, *Ann. Entomol. Soc. Am.* 101: 95–103, **[вторично]** по Feugère 2021).
- **Слышат ли нас?** Menda et al. 2019 только **отмечают**, что пики гласных человеческой речи (~200–1000 Гц, 45–70 дБ) лежат «in the sweet spot of mosquito hearing». Это замечание, а не доказательство, что комары используют речь.
- **Вокруг головы она кружит.** Zuo et al. 2026: при сочетании «тёмный силуэт + CO₂» Ae. aegypti **кружат** вокруг цели («more likely to circulate around the target», «sustained orbiting behavior»). Dekker & Cardé 2011: после потери CO₂ комар петляет и снова пересекает место, где его чувствовал. van Breugel 2015: путь к объекту петляет. Вместе с быстрым спадом громкости (п. 2) это **разумно объясняет** «писк то громче, то тише».
  - ⚠ Никто не измерял писк у головы спящего: это вывод, а не прямое наблюдение.
- **Тишина = села?** Звук — это взмахи. Когда комар сидит, крылья не машут, и тона нет (Arthur 2014: тон — следствие движения крыльев).
  - При взлёте с кожи крылья снова работают. У *An. coluzzii* силы крыльев дают **61 %** толчка при взлёте (Muijres et al. 2017, *J. Exp. Biol.* 220: 3751–3762, DOI 10.1242/jeb.163402, **[аннотация]**), так что улетая, она снова звучит.
  - ⚠ Тишина может значить и «отлетела на полметра»: один комар очень тихий. Формулировка: «If the sound stops, she may have landed.»
- **Самец рядом?** ⚠ Только у Ae. aegypti самцы держатся рядом с людьми, чтобы встретить самок (Cator & Harrington 2011 по Hartberg 1971). Кусают только самки. Поэтому «the whine at your ear is almost always a female» безопаснее, чем «always».

**Можно сказать:** «She is not singing to you.» «She circles your head, so the sound comes and goes.» «When she lands, her wings stop. The sound stops too.»
**Нельзя сказать:** «She buzzes to find you». «Silence always means she is biting». «Mosquitoes can hear your voice and follow it».

---

## 5. Порядок рассказа: проверка каждого шага

Предложенная цепочка: дыхание → голова (торчит из-под одеяла) → писк — это крылья (~500 в секунду) → песня для самцов, они подстраиваются → тишина = села.

| # | Шаг | Статус | Простая формулировка (EN) | Оговорка |
|---|---|---|---|---|
| 1 | Она чувствует твоё дыхание | ✅ | «Every breath sends out a cloud of carbon dioxide. She can sense it from metres away.» | «Метры» безопасно; «10 m» — только как «up to about ten metres» в верхней границе (Zuo 2026, сводка), а для человека дальность не измерена (van Breugel 2015). |
| 2 | Дыхание приводит к лицу | ✅ для части видов | «She follows it to your face.» | Опыты с отводом выдоха (atroparvus, albimanus); над спящим An. gambiae — над головой/грудью; Ae. aegypti целится в голову. Не у всех видов: малярийные Anopheles чаще кусают ноги. |
| 2b | Голова торчит из-под одеяла | ⚠ логика, не исследование | «At night, your face is often the only part not under the blanket.» | Не говорить «scientists found». Подаётся как наблюдение. |
| 2c | Вблизи — тепло | ✅ | «Close up, she can feel your warmth.» | ИК до ~70 см (Aedes, лаборатория), конвекция < 10 см. В приквеле уже было «body heat» — не противоречит. |
| 3 | Писк — это крылья | ✅ | «The whine is not her voice. It is her wings.» | Arthur 2014. |
| 3b | ~500 взмахов в секунду | ✅ с округлением | «about 400 to 500 times a second» или «hundreds of times a second» | Ae. aegypti ♀ 430–500; Culex pipiens ♀ ~410; зависит от температуры. «About five hundred» допустимо, если речь о «a mosquito» без вида. |
| 3c | Громко только у уха | ✅ физика | «From across the room, she is almost silent. Next to your ear, she is loud.» | Рой 70 самцов = 20 дБ на 0,9 м; один комар — в разы тише (мой расчёт). Чисел дБ в кадре не давать. |
| 4 | Песня — для самцов | ✅ | «Her note is a love song. It is meant for males.» | Cator 2009: «important mating signal». |
| 4b | Подстраиваются друг к другу | ✅ с упрощением | «When they meet, both change their notes until the notes match.» | Совпадают обертоны (~1200–1350 Гц), на расстоянии ~2 см; держится ~10 с. «Both» верно: самки тоже меняют тон. |
| 4c | Самки слышат | ✅ | «Yes, she can hear him too.» | Cator 2009; у самок вдвое меньше слуховых нейронов (Su 2018). |
| 5 | Писк не для тебя | ✅ | «So the song was never for you.» | Данных о звуковом поиске людей нет. |
| 6 | Тишина = села | ⚠ | «If the sound stops, she may have landed.» | Тишина может значить «отлетела». Не «always». |

**Причинная связка без рядов риторических вопросов (вариант для сценариста, 1 абзац, plain English):**
Breath → face → wings make the sound → the sound is a love song → the song isn't for you → silence = landed. Пример: «That whine by your ear at night is not a warning. It's a love song. Each time you breathe out, you send out carbon dioxide, and a female mosquito follows it. At night your face is often the only part outside the blanket, so that is where she ends up. The sound comes from her wings. They beat about five hundred times a second. She is so quiet that you only hear her when she is right next to your ear. And the song is for males. When a male and a female meet, both change their notes until they match. So she is not singing to you. If the sound suddenly stops, she may have landed.»
(Черновик для проверки фактов, не окончательный текст. Брендовую концовку и петлю решает сценарий.)

---

## 6. Однострочные оговорки для титров и описания
- «Mosquito species differ: some prefer feet; the head preference is shown for some species, not all.»
- «How far a mosquito can sense one person's breath has not been measured exactly.»
- «Wingbeat rates are typical lab values; they change with species and temperature.»
- «Male and female match higher overtones, not the same base note.»
- «Silence can also mean she flew away.»
- Иллюстрации пиксельные, не в масштабе.

## 7. Источники (DOI)
- van Breugel et al. 2015, Curr Biol — 10.1016/j.cub.2015.06.046 — PMC4546539 [полный текст]
- Chandel, DeBeaubien et al. 2024, Nature — 10.1038/s41586-024-07848-5 — PMC11410652 [полный текст]
- Zuo et al. 2026, Sci Adv — 10.1126/sciadv.adz7063 — PMC12998517 [полный текст]
- De Jong & Knols 1995, Experientia — 10.1007/BF01964925; Knols, Takken, De Jong 1994, JAMCA 10: 423–426 — обе прочитаны как главы 2–3 диссертации Knols 1996, https://edepot.wur.nl/210525 [полный текст глав]
- Dekker et al. 1998, Entomol Exp Appl — 10.1046/j.1570-7458.1998.00334.x [аннотация]
- Braack et al. 2015, Parasites & Vectors 8: 76 — 10.1186/s13071-015-0677-9 — PMC4320538 [полный текст]
- Lynd & McCall 2013, Malaria J 12: 267 — 10.1186/1475-2875-12-267 — PMC3733746 [полный текст]
- Gillies & Wilkes 1972 — 10.1017/S0007485300047295 [аннотация]; Gillies 1980 — 10.1017/S0007485300007811 [аннотация]
- Dekker, Geier, Cardé 2005 — 10.1242/jeb.01736; Dekker & Cardé 2011 — 10.1242/jeb.055186; Geier et al. 1999 — 10.1242/jeb.202.12.1639; Lacey & Cardé 2011 — 10.1111/j.1365-2915.2010.00921.x [аннотации]
- Arthur et al. 2014, JASA — 10.1121/1.4861233 [аннотация]
- Bomphrey et al. 2017, Nature — 10.1038/nature21727 — PMC5412966 [полный текст]
- Kim et al. 2021, Sci Rep 11: 10042 — 10.1038/s41598-021-89644-z — PMC8113239 [полный текст]
- Feugère et al. 2021, J R Soc Interface — 10.1098/rsif.2021.0121 — PMC8086941 [полный текст]
- Cator, Arthur, Harrington, Hoy 2009, Science — 10.1126/science.1166541 — PMC2847473 [полный текст]
- Gibson & Russell 2006, Curr Biol — 10.1016/j.cub.2006.05.053 [аннотация]; Gibson, Warren, Russell 2010, JARO — 10.1007/s10162-010-0243-2 [аннотация]
- Warren, Gibson, Russell 2009, Curr Biol — 10.1016/j.cub.2009.01.059 [аннотация]; Pennetier et al. 2010, Curr Biol — 10.1016/j.cub.2009.11.040 [аннотация]
- Cator & Harrington 2011, Anim Behav — 10.1016/j.anbehav.2011.07.013 — PMC3190198 [полный текст]
- Aldersley et al. 2016, J R Soc Interface — 10.1098/rsif.2015.1007 [аннотация]; Aldersley & Cator 2019, Sci Rep — 10.1038/s41598-019-38599-3 [аннотация]
- Su et al. 2018, Nat Commun — 10.1038/s41467-018-06388-7 — PMC6156513 [полный текст]
- Menda et al. 2019, Curr Biol — 10.1016/j.cub.2019.01.026 [аннотация]
- Muijres et al. 2017, J Exp Biol — 10.1242/jeb.163402 [аннотация]

Для строки `Sources:` в описании (по стандарту публикаций): Cator et al. 2009 (Science); Chandel et al. 2024 (Nature); De Jong & Knols 1995; Lynd & McCall 2013; Bomphrey et al. 2017 (Nature).
