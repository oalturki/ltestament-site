# أدوات بناء موقع «العهد الأخير»

هذه الأدوات تولّد صفحات اللغات من الصفحة العربية (`index.html` في جذر المستودع)، وهي المرجع.
لا تُستخدم في تشغيل الموقع؛ هي للصيانة والتطوير فقط.

| الملف | وظيفته |
|---|---|
| `build_lang.py` | يبني صفحة لغة (en/fr/es/ru) من الصفحة العربية + ملف محتوى اللغة. التشغيل: `python3 tools/build_lang.py en fr es ru` |
| `content_<lang>.py` | كل نصوص اللغة: العناوين، البطاقات، نوافذ الآيات، ترجمات الآيات (من QuranEnc)، أسماء السور |
| `build_en_ayah.py` | نصوص نوافذ الآيات الإنجليزية |
| `build_feedback.py` | يولّد صفحات «رأيك يهمنا» لكل لغة |
| `feedback_hooks.py` | يضيف روابط «رأيك يهمنا» وقسم «قالوا عن الموقع» إلى الصفحات الرئيسية |
| `make_og.py` | يولّد صور بطاقات المشاركة og-<lang>.jpg (يحتاج Chrome وخطوط في `tools/fonts/`) |

## إضافة لغة جديدة
1. أنشئ `content_<lang>.py` بنفس مفاتيح `content_fr.py`، واختر ترجمة معاني معتمدة من QuranEnc (`reader_key`).
2. أضف اللغة إلى `ALL_LANGS` في `build_lang.py`، وإلى `feedback_hooks.py` و`build_feedback.py`، وإلى `TEXT` في `js/feedback.js`.
3. شغّل البناء، ثم أضف رابط اللغة ووسم hreflang في الصفحتين العربية والأردية، وحدّث `sitemap.xml`.

## الترجمات المعتمدة (QuranEnc.com)
- الإنجليزية: `english_saheeh` — صحيح إنترناشونال (مركز نور إنترناشيونال)
- الفرنسية: `french_montada` — د. نبيل رضوان (مركز نور إنترناشيونال)
- الإسبانية: `spanish_montada_latin` — النسخة اللاتينية (مركز نور إنترناشيونال)
- الروسية: `russian_aboadel` — أبو عادل (اختيرت بدل ترجمة رواد لأن الأخيرة تُسقط «وما أوتي موسى وعيسى» من البقرة ١٣٦)
- الأردية: `urdu_junagarhi` — محمد جوناگڑھی (في `ur/index.html` مباشرة)

## قاعدة البيانات
مشروع Supabase «ltestament» (eu-central-1): جدول `feedback`، و`admins`، والدوال `get_testimonials` و`rating_stats` و`moderate_feedback`.
