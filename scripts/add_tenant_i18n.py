import json, io, os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend'))

AUTH = {
 'en': {"panchayat": "Panchayat", "selectPanchayat": "Select your Panchayat…", "panchayatHint": "Your Panchayat determines which village services you can access.", "loadingPanchayats": "Loading Panchayats…", "errPanchayat": "Select your Panchayat."},
 'hi': {"panchayat": "पंचायत", "selectPanchayat": "अपनी पंचायत चुनें…", "panchayatHint": "आपकी पंचायत यह तय करती है कि आप कौन-सी गाँव सेवाएँ इस्तेमाल कर सकते हैं।", "loadingPanchayats": "पंचायतें लोड हो रही हैं…", "errPanchayat": "अपनी पंचायत चुनें।"},
 'bn': {"panchayat": "পঞ্চায়েত", "selectPanchayat": "আপনার পঞ্চায়েত বাছুন…", "panchayatHint": "আপনার পঞ্চায়েত ঠিক করে কোন গ্রাম সেবা আপনি ব্যবহার করতে পারবেন।", "loadingPanchayats": "পঞ্চায়েত লোড হচ্ছে…", "errPanchayat": "আপনার পঞ্চায়েত বাছুন।"},
 'mr': {"panchayat": "पंचायत", "selectPanchayat": "तुमची पंचायत निवडा…", "panchayatHint": "तुमची पंचायत ठरवते कोणत्या गाव सेवा तुम्ही वापरू शकता.", "loadingPanchayats": "पंचायती लोड होत आहेत…", "errPanchayat": "तुमची पंचायत निवडा."},
 'ta': {"panchayat": "பஞ்சாயத்து", "selectPanchayat": "உங்கள் பஞ்சாயத்தைத் தேர்வு செய்யுங்கள்…", "panchayatHint": "உங்கள் பஞ்சாயத்து எந்த கிராம சேவைகளை நீங்கள் பயன்படுத்தலாம் என்பதைத் தீர்மானிக்கிறது.", "loadingPanchayats": "பஞ்சாயத்துகள் ஏற்றப்படுகின்றன…", "errPanchayat": "உங்கள் பஞ்சாயத்தைத் தேர்வு செய்யுங்கள்."},
 'te': {"panchayat": "పంచాయతీ", "selectPanchayat": "మీ పంచాయతీని ఎంచుకోండి…", "panchayatHint": "మీ పంచాయతీ మీరు ఏ గ్రామ సేవలను వాడగలరో నిర్ణయిస్తుంది.", "loadingPanchayats": "పంచాయతీలు లోడ్ అవుతున్నాయి…", "errPanchayat": "మీ పంచాయతీని ఎంచుకోండి."},
 'gu': {"panchayat": "પંચાયત", "selectPanchayat": "તમારી પંચાયત પસંદ કરો…", "panchayatHint": "તમારી પંચાયત નક્કી કરે છે કે તમે કઈ ગામ સેવાઓ વાપરી શકો.", "loadingPanchayats": "પંચાયતો લોડ થાય છે…", "errPanchayat": "તમારી પંચાયત પસંદ કરો."},
 'pa': {"panchayat": "ਪੰਚਾਇਤ", "selectPanchayat": "ਆਪਣੀ ਪੰਚਾਇਤ ਚੁਣੋ…", "panchayatHint": "ਤੁਹਾਡੀ ਪੰਚਾਇਤ ਤੈਅ ਕਰਦੀ ਹੈ ਕਿ ਤੁਸੀਂ ਕਿਹੜੀਆਂ ਪਿੰਡ ਸੇਵਾਵਾਂ ਵਰਤ ਸਕਦੇ ਹੋ।", "loadingPanchayats": "ਪੰਚਾਇਤਾਂ ਲੋਡ ਹੋ ਰਹੀਆਂ ਹਨ…", "errPanchayat": "ਆਪਣੀ ਪੰਚਾਇਤ ਚੁਣੋ।"},
}

NAV = {'en': 'Panchayat', 'hi': 'पंचायत', 'bn': 'পঞ্চায়েত', 'mr': 'पंचायत', 'ta': 'பஞ்சாயத்து', 'te': 'పంచాయతీ', 'gu': 'પંચાયત', 'pa': 'ਪੰਚਾਇਤ'}

ADMIN = {
 'en': {"viewingPanchayat": "Viewing Panchayat", "selectPanchayat": "Select a Panchayat…", "selectPanchayatFirst": "Select a Panchayat to view its data", "selectPanchayatFirstDesc": "As a platform administrator, choose which Panchayat's operations you want to inspect.", "suspended": "Suspended"},
 'hi': {"viewingPanchayat": "देखी जा रही पंचायत", "selectPanchayat": "पंचायत चुनें…", "selectPanchayatFirst": "डेटा देखने के लिए पंचायत चुनें", "selectPanchayatFirstDesc": "प्लेटफ़ॉर्म व्यवस्थापक के रूप में चुनें कि किस पंचायत के संचालन की आप समीक्षा करना चाहते हैं।", "suspended": "निलंबित"},
 'bn': {"viewingPanchayat": "দেখা পঞ্চায়েত", "selectPanchayat": "পঞ্চায়েত বাছুন…", "selectPanchayatFirst": "ডেটা দেখতে পঞ্চায়েত বাছুন", "selectPanchayatFirstDesc": "প্ল্যাটফর্ম প্রশাসক হিসেবে বাছুন কোন পঞ্চায়েতের পরিচালনা আপনি পর্যালোচনা করতে চান।", "suspended": "স্থগিত"},
 'mr': {"viewingPanchayat": "पाहिली जाणारी पंचायत", "selectPanchayat": "पंचायत निवडा…", "selectPanchayatFirst": "डेटा पाहण्यासाठी पंचायत निवडा", "selectPanchayatFirstDesc": "प्लॅटफॉर्म प्रशासक म्हणून निवडा कोणत्या पंचायतीचे संचालन तुम्ही पाहू इच्छिता.", "suspended": "निलंबित"},
 'ta': {"viewingPanchayat": "பார்க்கப்படும் பஞ்சாயத்து", "selectPanchayat": "பஞ்சாயத்தைத் தேர்வு செய்யுங்கள்…", "selectPanchayatFirst": "தரவைப் பார்க்க பஞ்சாயத்தைத் தேர்வு செய்யுங்கள்", "selectPanchayatFirstDesc": "தள நிர்வாகியாக, எந்த பஞ்சாயத்தின் செயல்பாடுகளை ஆய்வு செய்ய விரும்புகிறீர்கள் என்பதைத் தேர்வு செய்யுங்கள்.", "suspended": "இடைநீக்கம்"},
 'te': {"viewingPanchayat": "చూస్తున్న పంచాయతీ", "selectPanchayat": "పంచాయతీని ఎంచుకోండి…", "selectPanchayatFirst": "డేటా చూడటానికి పంచాయతీని ఎంచుకోండి", "selectPanchayatFirstDesc": "ప్లాట్‌ఫారమ్ నిర్వాహకుడిగా, ఏ పంచాయతీ కార్యకలాపాలను పరిశీలించాలనుకుంటున్నారో ఎంచుకోండి.", "suspended": "సస్పెండ్"},
 'gu': {"viewingPanchayat": "જોવાતી પંચાયત", "selectPanchayat": "પંચાયત પસંદ કરો…", "selectPanchayatFirst": "ડેટા જોવા પંચાયત પસંદ કરો", "selectPanchayatFirstDesc": "પ્લેટફોર્મ વ્યવસ્થાપક તરીકે પસંદ કરો કે કઈ પંચાયતનું સંચાલન તમે જોવા માંગો છો.", "suspended": "સ્થગિત"},
 'pa': {"viewingPanchayat": "ਦੇਖੀ ਜਾ ਰਹੀ ਪੰਚਾਇਤ", "selectPanchayat": "ਪੰਚਾਇਤ ਚੁਣੋ…", "selectPanchayatFirst": "ਡਾਟਾ ਦੇਖਣ ਲਈ ਪੰਚਾਇਤ ਚੁਣੋ", "selectPanchayatFirstDesc": "ਪਲੇਟਫਾਰਮ ਪ੍ਰਬੰਧਕ ਵਜੋਂ ਚੁਣੋ ਕਿ ਕਿਸ ਪੰਚਾਇਤ ਦੇ ਕੰਮਕਾਜ ਦੀ ਤੁਸੀਂ ਸਮੀਖਿਆ ਕਰਨੀ ਹੈ।", "suspended": "ਮੁਅੱਤਲ"},
}

SA = {
 'en': {
  "nav": "Platform", "brand": "Platform Administration", "brandSub": "Super admin console",
  "title": "Platform Administration", "subtitle": "Manage every Panchayat on SmartGram Pro.",
  "addPanchayat": "Add Panchayat", "totalPanchayats": "Total Panchayats", "activePanchayats": "Active Panchayats",
  "totalUsers": "Total users", "totalComplaints": "Total complaints", "resolutionRate": "Resolution rate",
  "panchayatsTitle": "Panchayats", "colName": "Name", "colId": "ID", "colDistrict": "District",
  "colComplaints": "Complaints", "colStatus": "Status", "colActions": "Actions",
  "active": "Active", "suspended": "Suspended", "suspend": "Suspend", "activate": "Activate",
  "auditTitle": "Recent activity", "auditEmpty": "No administrative activity recorded yet.",
  "suspendedToast": "Panchayat suspended.", "activatedToast": "Panchayat activated.",
  "nameRequired": "Panchayat name is required.", "panchayatIdLabel": "Panchayat ID",
  "panchayatIdHint": "Optional — a unique code like PB010. Leave blank to generate one automatically.",
  "nameLabel": "Name", "namePlaceholder": "e.g. Rampur Gram Panchayat", "districtLabel": "District", "stateLabel": "State",
  "emailLabel": "Contact email", "phoneLabel": "Contact phone",
  "adminSection": "Panchayat admin (optional)", "adminUsername": "Admin username",
  "adminEmail": "Admin email", "adminPassword": "Admin password", "create": "Create Panchayat",
 },
 'hi': {
  "nav": "प्लेटफ़ॉर्म", "brand": "प्लेटफ़ॉर्म प्रशासन", "brandSub": "सुपर एडमिन कंसोल",
  "title": "प्लेटफ़ॉर्म प्रशासन", "subtitle": "SmartGram Pro की सभी पंचायतें प्रबंधित करें।",
  "addPanchayat": "पंचायत जोड़ें", "totalPanchayats": "कुल पंचायतें", "activePanchayats": "सक्रिय पंचायतें",
  "totalUsers": "कुल उपयोगकर्ता", "totalComplaints": "कुल शिकायतें", "resolutionRate": "निपटान दर",
  "panchayatsTitle": "पंचायतें", "colName": "नाम", "colId": "आईडी", "colDistrict": "ज़िला",
  "colComplaints": "शिकायतें", "colStatus": "स्थिति", "colActions": "कार्य",
  "active": "सक्रिय", "suspended": "निलंबित", "suspend": "निलंबित करें", "activate": "सक्रिय करें",
  "auditTitle": "हाल की गतिविधि", "auditEmpty": "अभी कोई प्रशासनिक गतिविधि दर्ज नहीं है।",
  "suspendedToast": "पंचायत निलंबित।", "activatedToast": "पंचायत सक्रिय।",
  "nameRequired": "पंचायत का नाम आवश्यक है।", "panchayatIdLabel": "पंचायत आईडी",
  "panchayatIdHint": "वैकल्पिक — PB010 जैसा अद्वितीय कोड। खाली छोड़ें तो स्वतः बनेगा।",
  "nameLabel": "नाम", "namePlaceholder": "जैसे रामपुर ग्राम पंचायत", "districtLabel": "ज़िला", "stateLabel": "राज्य",
  "emailLabel": "संपर्क ईमेल", "phoneLabel": "संपर्क फ़ोन",
  "adminSection": "पंचायत प्रशासक (वैकल्पिक)", "adminUsername": "प्रशासक उपयोगकर्ता नाम",
  "adminEmail": "प्रशासक ईमेल", "adminPassword": "प्रशासक पासवर्ड", "create": "पंचायत बनाएँ",
 },
 'bn': {
  "nav": "প্ল্যাটফর্ম", "brand": "প্ল্যাটফর্ম প্রশাসন", "brandSub": "সুপার অ্যাডমিন কনসোল",
  "title": "প্ল্যাটফর্ম প্রশাসন", "subtitle": "SmartGram Pro-এর সব পঞ্চায়েত পরিচালনা করুন।",
  "addPanchayat": "পঞ্চায়েত যোগ করুন", "totalPanchayats": "মোট পঞ্চায়েত", "activePanchayats": "সক্রিয় পঞ্চায়েত",
  "totalUsers": "মোট ব্যবহারকারী", "totalComplaints": "মোট অভিযোগ", "resolutionRate": "নিষ্পত্তির হার",
  "panchayatsTitle": "পঞ্চায়েতসমূহ", "colName": "নাম", "colId": "আইডি", "colDistrict": "জেলা",
  "colComplaints": "অভিযোগ", "colStatus": "স্থিতি", "colActions": "কার্য",
  "active": "সক্রিয়", "suspended": "স্থগিত", "suspend": "স্থগিত করুন", "activate": "সক্রিয় করুন",
  "auditTitle": "সাম্প্রতিক কার্যক্রম", "auditEmpty": "এখনও কোনো প্রশাসনিক কার্যক্রম নথিভুক্ত হয়নি।",
  "suspendedToast": "পঞ্চায়েত স্থগিত।", "activatedToast": "পঞ্চায়েত সক্রিয়।",
  "nameRequired": "পঞ্চায়েতের নাম আবশ্যক।", "panchayatIdLabel": "পঞ্চায়েত আইডি",
  "panchayatIdHint": "ঐচ্ছিক — PB010-এর মতো অনন্য কোড। খালি রাখলে স্বয়ংক্রিয়ভাবে তৈরি হবে।",
  "nameLabel": "নাম", "namePlaceholder": "যেমন রামপুর গ্রাম পঞ্চায়েত", "districtLabel": "জেলা", "stateLabel": "রাজ্য",
  "emailLabel": "যোগাযোগ ইমেল", "phoneLabel": "যোগাযোগ ফোন",
  "adminSection": "পঞ্চায়েত প্রশাসক (ঐচ্ছিক)", "adminUsername": "প্রশাসকের ব্যবহারকারী নাম",
  "adminEmail": "প্রশাসকের ইমেল", "adminPassword": "প্রশাসকের পাসওয়ার্ড", "create": "পঞ্চায়েত তৈরি করুন",
 },
 'mr': {
  "nav": "प्लॅटफॉर्म", "brand": "प्लॅटफॉर्म प्रशासन", "brandSub": "सुपर अ‍ॅडमिन कन्सोल",
  "title": "प्लॅटफॉर्म प्रशासन", "subtitle": "SmartGram Pro वरील सर्व पंचायती व्यवस्थापित करा.",
  "addPanchayat": "पंचायत जोडा", "totalPanchayats": "एकूण पंचायती", "activePanchayats": "सक्रिय पंचायती",
  "totalUsers": "एकूण वापरकर्ते", "totalComplaints": "एकूण तक्रारी", "resolutionRate": "निकाल दर",
  "panchayatsTitle": "पंचायती", "colName": "नाव", "colId": "आयडी", "colDistrict": "जिल्हा",
  "colComplaints": "तक्रारी", "colStatus": "स्थिती", "colActions": "कृती",
  "active": "सक्रिय", "suspended": "निलंबित", "suspend": "निलंबित करा", "activate": "सक्रिय करा",
  "auditTitle": "अलीकडील कारवाया", "auditEmpty": "अजून कोणती प्रशासकीय कारवाय नोंदवलेली नाही.",
  "suspendedToast": "पंचायत निलंबित.", "activatedToast": "पंचायत सक्रिय.",
  "nameRequired": "पंचायतीचे नाव आवश्यक आहे.", "panchayatIdLabel": "पंचायत आयडी",
  "panchayatIdHint": "ऐच्छिक — PB010 सारखा अद्वितीय कोड. रिकामा सोडला तर आपोआप तयार होईल.",
  "nameLabel": "नाव", "namePlaceholder": "उदा. रामपूर ग्रामपंचायत", "districtLabel": "जिल्हा", "stateLabel": "राज्य",
  "emailLabel": "संपर्क ईमेल", "phoneLabel": "संपर्क फोन",
  "adminSection": "पंचायत प्रशासक (ऐच्छिक)", "adminUsername": "प्रशासक वापरकर्तानाव",
  "adminEmail": "प्रशासक ईमेल", "adminPassword": "प्रशासक पासवर्ड", "create": "पंचायत तयार करा",
 },
 'ta': {
  "nav": "தளம்", "brand": "தள நிர்வாகம்", "brandSub": "சூப்பர் நிர்வாக கன்சோல்",
  "title": "தள நிர்வாகம்", "subtitle": "SmartGram Pro-ல் உள்ள அனைத்து பஞ்சாயத்துகளையும் நிர்வகிக்கவும்.",
  "addPanchayat": "பஞ்சாயத்தைச் சேர்", "totalPanchayats": "மொத்த பஞ்சாயத்துகள்", "activePanchayats": "செயலில் உள்ளவை",
  "totalUsers": "மொத்த பயனர்கள்", "totalComplaints": "மொத்த புகார்கள்", "resolutionRate": "தீர்வு விகிதம்",
  "panchayatsTitle": "பஞ்சாயத்துகள்", "colName": "பெயர்", "colId": "ஐடி", "colDistrict": "மாவட்டம்",
  "colComplaints": "புகார்கள்", "colStatus": "நிலை", "colActions": "செயல்",
  "active": "செயலில்", "suspended": "இடைநீக்கம்", "suspend": "இடைநீக்கு", "activate": "செயல்படுத்து",
  "auditTitle": "சமீபத்திய நடவடிக்கைகள்", "auditEmpty": "இன்னும் நிர்வாக நடவடிக்கை எதுவும் பதிவாகவில்லை.",
  "suspendedToast": "பஞ்சாயத்து இடைநீக்கம் செய்யப்பட்டது.", "activatedToast": "பஞ்சாயத்து செயல்படுத்தப்பட்டது.",
  "nameRequired": "பஞ்சாயத்து பெயர் தேவை.", "panchayatIdLabel": "பஞ்சாயத்து ஐடி",
  "panchayatIdHint": "விருப்பம் — PB010 போன்ற தனித்த குறியீடு. காலியாக விட்டால் தானாக உருவாகும்.",
  "nameLabel": "பெயர்", "namePlaceholder": "எ.கா. ராம்பூர் கிராம பஞ்சாயத்து", "districtLabel": "மாவட்டம்", "stateLabel": "மாநிலம்",
  "emailLabel": "தொடர்பு மின்னஞ்சல்", "phoneLabel": "தொடர்பு தொலைபேசி",
  "adminSection": "பஞ்சாயத்து நிர்வாகி (விருப்பம்)", "adminUsername": "நிர்வாகி பயனர்பெயர்",
  "adminEmail": "நிர்வாகி மின்னஞ்சல்", "adminPassword": "நிர்வாகி கடவுச்சொல்", "create": "பஞ்சாயத்தை உருவாக்கு",
 },
 'te': {
  "nav": "ప్లాట్‌ఫారమ్", "brand": "ప్లాట్‌ఫారమ్ నిర్వహణ", "brandSub": "సూపర్ అడ్మిన్ కన్సోల్",
  "title": "ప్లాట్‌ఫారమ్ నిర్వహణ", "subtitle": "SmartGram Proలోని అన్ని పంచాయతీలను నిర్వహించండి.",
  "addPanchayat": "పంచాయతీ జోడించండి", "totalPanchayats": "మొత్తం పంచాయతీలు", "activePanchayats": "క్రియాశీల పంచాయతీలు",
  "totalUsers": "మొత్తం వినియోగదారులు", "totalComplaints": "మొత్తం ఫిర్యాదులు", "resolutionRate": "పరిష్కార రేటు",
  "panchayatsTitle": "పంచాయతీలు", "colName": "పేరు", "colId": "ఐడీ", "colDistrict": "జిల్లా",
  "colComplaints": "ఫిర్యాదులు", "colStatus": "స్థితి", "colActions": "చర్య",
  "active": "క్రియాశీలక", "suspended": "సస్పెండ్", "suspend": "సస్పెండ్ చేయి", "activate": "క్రియాశీలపరచు",
  "auditTitle": "ఇటీవలి కార్యకలాపాలు", "auditEmpty": "ఇంకా నిర్వాహక కార్యకలాపం నమోదు కాలేదు.",
  "suspendedToast": "పంచాయతీ సస్పెండ్ అయింది.", "activatedToast": "పంచాయతీ క్రియాశీలపరచబడింది.",
  "nameRequired": "పంచాయతీ పేరు అవసరం.", "panchayatIdLabel": "పంచాయతీ ఐడీ",
  "panchayatIdHint": "ఐచ్ఛికం — PB010 లాంటి ప్రత్యేక కోడ్. ఖాళీగా వదిల్తే స్వయంగా ఏర్పడుతుంది.",
  "nameLabel": "పేరు", "namePlaceholder": "ఉదా. రాంపూర్ గ్రామ పంచాయతీ", "districtLabel": "జిల్లా", "stateLabel": "రాష్ట్రం",
  "emailLabel": "సంప్రదింపు ఇమెయిల్", "phoneLabel": "సంప్రదింపు ఫోన్",
  "adminSection": "పంచాయతీ నిర్వాహకుడు (ఐచ్ఛికం)", "adminUsername": "నిర్వాహక వినియోగదారు పేరు",
  "adminEmail": "నిర్వాహక ఇమెయిల్", "adminPassword": "నిర్వాహక పాస్‌వర్డ్", "create": "పంచాయతీ సృష్టించండి",
 },
 'gu': {
  "nav": "પ્લેટફોર્મ", "brand": "પ્લેટફોર્મ વ્યવસ્થાપન", "brandSub": "સુપર એડમિન કન્સોલ",
  "title": "પ્લેટફોર્મ વ્યવસ્થાપન", "subtitle": "SmartGram Pro પરની દરેક પંચાયત વ્યવસ્થાપિત કરો.",
  "addPanchayat": "પંચાયત ઉમેરો", "totalPanchayats": "કુલ પંચાયતો", "activePanchayats": "સક્રિય પંચાયતો",
  "totalUsers": "કુલ વપરાશકર્તાઓ", "totalComplaints": "કુલ ફરિયાદો", "resolutionRate": "નિકાલ દર",
  "panchayatsTitle": "પંચાયતો", "colName": "નામ", "colId": "આઈડી", "colDistrict": "જિલ્લો",
  "colComplaints": "ફરિયાદો", "colStatus": "સ્થિતિ", "colActions": "ક્રિયા",
  "active": "સક્રિય", "suspended": "સ્થગિત", "suspend": "સ્થગિત કરો", "activate": "સક્રિય કરો",
  "auditTitle": "તાજી પ્રવૃત્તિ", "auditEmpty": "હજી કોઈ વ્યવસ્થાપક પ્રવૃત્તિ નોંધાઈ નથી.",
  "suspendedToast": "પંચાયત સ્થગિત.", "activatedToast": "પંચાયત સક્રિય.",
  "nameRequired": "પંચાયતનું નામ જરૂરી છે.", "panchayatIdLabel": "પંચાયત આઈડી",
  "panchayatIdHint": "વૈકલ્પિક — PB010 જેવો અનન્ય કોડ. ખાલી રાખો તો આપોઆપ બનશે.",
  "nameLabel": "નામ", "namePlaceholder": "દા.ત. રામપુર ગ્રામ પંચાયત", "districtLabel": "જિલ્લો", "stateLabel": "રાજ્ય",
  "emailLabel": "સંપર્ક ઈમેલ", "phoneLabel": "સંપર્ક ફોન",
  "adminSection": "પંચાયત એડમિન (વૈકલ્પિક)", "adminUsername": "એડમિન વપરાશકર્તા નામ",
  "adminEmail": "એડમિન ઈમેલ", "adminPassword": "એડમિન પાસવર્ડ", "create": "પંચાયત બનાવો",
 },
 'pa': {
  "nav": "ਪਲੇਟਫਾਰਮ", "brand": "ਪਲੇਟਫਾਰਮ ਪ੍ਰਬੰਧਨ", "brandSub": "ਸੁਪਰ ਐਡਮਿਨ ਕੰਸੋਲ",
  "title": "ਪਲੇਟਫਾਰਮ ਪ੍ਰਬੰਧਨ", "subtitle": "SmartGram Pro ਤੇ ਹਰ ਪੰਚਾਇਤ ਪ੍ਰਬੰਧਿਤ ਕਰੋ।",
  "addPanchayat": "ਪੰਚਾਇਤ ਜੋੜੋ", "totalPanchayats": "ਕੁੱਲ ਪੰਚਾਇਤਾਂ", "activePanchayats": "ਸਰਗਰਮ ਪੰਚਾਇਤਾਂ",
  "totalUsers": "ਕੁੱਲ ਵਰਤੋਂਕਾਰ", "totalComplaints": "ਕੁੱਲ ਸ਼ਿਕਾਇਤਾਂ", "resolutionRate": "ਨਿਪਟਾਰਾ ਦਰ",
  "panchayatsTitle": "ਪੰਚਾਇਤਾਂ", "colName": "ਨਾਮ", "colId": "ਆਈਡੀ", "colDistrict": "ਜ਼ਿਲ੍ਹਾ",
  "colComplaints": "ਸ਼ਿਕਾਇਤਾਂ", "colStatus": "ਸਥਿਤੀ", "colActions": "ਕਾਰਵਾਈ",
  "active": "ਸਰਗਰਮ", "suspended": "ਮੁਅੱਤਲ", "suspend": "ਮੁਅੱਤਲ ਕਰੋ", "activate": "ਸਰਗਰਮ ਕਰੋ",
  "auditTitle": "ਹਾਲੀਆ ਗਤੀਵਿਧੀ", "auditEmpty": "ਹਾਲੇ ਕੋਈ ਪ੍ਰਬੰਧਕੀ ਗਤੀਵਿਧੀ ਦਰਜ ਨਹੀਂ।",
  "suspendedToast": "ਪੰਚਾਇਤ ਮੁਅੱਤਲ।", "activatedToast": "ਪੰਚਾਇਤ ਸਰਗਰਮ।",
  "nameRequired": "ਪੰਚਾਇਤ ਦਾ ਨਾਮ ਜ਼ਰੂਰੀ ਹੈ।", "panchayatIdLabel": "ਪੰਚਾਇਤ ਆਈਡੀ",
  "panchayatIdHint": "ਵਿਕਲਪਿਕ — PB010 ਵਰਗਾ ਵੱਖਰਾ ਕੋਡ। ਖਾਲੀ ਛੱਡੋ ਤਾਂ ਆਪਣੇ ਆਪ ਬਣ ਜਾਵੇਗਾ।",
  "nameLabel": "ਨਾਮ", "namePlaceholder": "ਜਿਵੇਂ ਰਾਮਪੁਰ ਗ੍ਰਾਮ ਪੰਚਾਇਤ", "districtLabel": "ਜ਼ਿਲ੍ਹਾ", "stateLabel": "ਰਾਜ",
  "emailLabel": "ਸੰਪਰਕ ਈਮੇਲ", "phoneLabel": "ਸੰਪਰਕ ਫੋਨ",
  "adminSection": "ਪੰਚਾਇਤ ਪ੍ਰਬੰਧਕ (ਵਿਕਲਪਿਕ)", "adminUsername": "ਪ੍ਰਬੰਧਕ ਵਰਤੋਂਕਾਰ ਨਾਮ",
  "adminEmail": "ਪ੍ਰਬੰਧਕ ਈਮੇਲ", "adminPassword": "ਪ੍ਰਬੰਧਕ ਪਾਸਵਰਡ", "create": "ਪੰਚਾਇਤ ਬਣਾਓ",
 },
}

NOTICES = {
 'en': {"choosePanchayat": "Choose your Panchayat", "selectPanchayat": "Select a Panchayat to see its notices…"},
 'hi': {"choosePanchayat": "अपनी पंचायत चुनें", "selectPanchayat": "सूचनाएँ देखने के लिए पंचायत चुनें…"},
 'bn': {"choosePanchayat": "আপনার পঞ্চায়েত বাছুন", "selectPanchayat": "বিজ্ঞপ্তি দেখতে পঞ্চায়েত বাছুন…"},
 'mr': {"choosePanchayat": "तुमची पंचायत निवडा", "selectPanchayat": "सूचना पाहण्यासाठी पंचायत निवडा…"},
 'ta': {"choosePanchayat": "உங்கள் பஞ்சாயத்தைத் தேர்வு செய்யுங்கள்", "selectPanchayat": "அறிவிப்புகளைப் பார்க்க பஞ்சாயத்தைத் தேர்வு செய்யுங்கள்…"},
 'te': {"choosePanchayat": "మీ పంచాయతీని ఎంచుకోండి", "selectPanchayat": "ప్రకటనలు చూడటానికి పంచాయతీని ఎంచుకోండి…"},
 'gu': {"choosePanchayat": "તમારી પંચાયત પસંદ કરો", "selectPanchayat": "સૂચનાઓ જોવા પંચાયત પસંદ કરો…"},
 'pa': {"choosePanchayat": "ਆਪਣੀ ਪੰਚਾਇਤ ਚੁਣੋ", "selectPanchayat": "ਸੂਚਨਾਵਾਂ ਦੇਖਣ ਲਈ ਪੰਚਾਇਤ ਚੁਣੋ…"},
}

for lang in SA:
    path = f'src/i18n/locales/{lang}/translation.json'
    with io.open(path, encoding='utf-8') as f:
        data = json.load(f)
    data.setdefault('auth', {}).update(AUTH[lang])
    data['nav']['panchayat'] = NAV[lang]
    data.setdefault('admin', {}).update(ADMIN[lang])
    data['superAdmin'] = SA[lang]
    data.setdefault('notices', {}).update(NOTICES[lang])
    with io.open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

print('multi-tenant i18n merged')
