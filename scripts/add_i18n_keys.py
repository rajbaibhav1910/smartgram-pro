import json, io, os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend'))

EN = {
  "common": {"cancel": "Cancel"},
  "nav": {
    "skipToContent": "Skip to main content",
    "loggedOutToast": "You have been signed out."
  },
  "auth": {
    "welcomeBack": "Welcome back, {{name}}!",
    "accountCreated": "Account created. Welcome to SmartGram!"
  },
  "profile": {
    "title": "Profile",
    "subtitle": "Your account details on record with the Gram Panchayat.",
    "userId": "User ID",
    "role": "Role",
    "roleAdmin": "Panchayat admin",
    "roleCitizen": "Citizen",
    "memberSince": "Member since",
    "securityTitle": "Account security",
    "securityDesc": "Your password is stored only as a one-way hash and your session is protected by an encrypted, HTTP-only cookie. Account details can be updated by contacting the panchayat office.",
    "loggedOut": "Signed out."
  },
  "detail": {
    "pageTitle": "Complaint details",
    "statusUpdated": "Status updated to {{status}}."
  },
  "submit": {"toastSuccess": "Complaint submitted successfully."},
  "notices": {
    "postNotice": "Post a notice",
    "composerTitle": "Post a new notice",
    "createTitle": "Title",
    "createTitlePlaceholder": "e.g. Gram sabha meeting on Sunday",
    "createCategory": "Category",
    "createContent": "Notice content",
    "createContentPlaceholder": "Write the full notice text citizens will read…",
    "createExpiry": "Expiry date",
    "createExpiryHint": "Optional — the notice is shown as expired after this date.",
    "createSubmit": "Publish notice",
    "created": "Notice published.",
    "createError": "Could not publish the notice. Please try again.",
    "createRequired": "A title and content are required."
  },
  "landing": {
    "trackerD1": "Mon, 2 Sep · 10:14 AM",
    "trackerD2": "Tue, 3 Sep · 9:02 AM",
    "trackerD3": "Thu, 5 Sep · 2:40 PM",
    "howTitle": "How it works",
    "howSubtitle": "From noticing a problem to seeing it fixed — three simple steps, fully tracked.",
    "step1Title": "Report the issue",
    "step1Desc": "Pick a category, describe the problem, and attach a photo as evidence. It takes less than two minutes.",
    "step2Title": "Panchayat takes action",
    "step2Desc": "Staff review your complaint, assign it to the right department, and post updates as work happens.",
    "step3Title": "Track until resolved",
    "step3Desc": "Follow the timeline from submission to resolution. You always know exactly where things stand.",
    "trackingBadge": "Complaint tracking",
    "trackingTitle": "Every complaint has a paper trail",
    "trackingDesc": "No more chasing officials or wondering what happened. Each complaint gets a unique ID and a transparent, timestamped history of every action taken.",
    "trackingPoint1": "Unique complaint ID for every report",
    "trackingPoint2": "Timestamped status history with official remarks",
    "trackingPoint3": "Email alerts when the status changes",
    "trackingFlowTitle": "Status at a glance",
    "trackingAssigned": "Assigned to department",
    "schemesTitle": "Government schemes",
    "schemesSubtitle": "Central welfare schemes explained simply — what you get and who qualifies.",
    "noticesTitle": "Notices & updates",
    "noticesSubtitle": "Official announcements from your Gram Panchayat, published and archived.",
    "transparencyBadge": "Transparency",
    "transparencyTitle": "Open by default",
    "transparencyDesc": "A public record means fewer things get lost. Complaints, notices, and scheme information stay visible and accountable.",
    "transparencyItem1": "Every complaint on record",
    "transparencyItem2": "Written status updates",
    "transparencyItem3": "Published notices archive",
    "transparencyItem4": "Timestamped timelines",
    "impactBadge": "Community impact",
    "impactTitle": "Small reports, visible change",
    "impactDesc": "A broken street light reported today is a repaired street light next week. When neighbours report issues through one shared system, the panchayat can prioritise what matters most to the whole village.",
    "trustBadge": "Trust & security",
    "trustTitle": "Built on trust",
    "trustSubtitle": "Your reports and personal details deserve the same protection as any government record.",
    "trust1Title": "Encrypted sessions",
    "trust1Desc": "Sign-in sessions use secure, HTTP-only cookies — credentials are never exposed to the browser.",
    "trust2Title": "AWS infrastructure",
    "trust2Desc": "Data is stored in Amazon DynamoDB with media in S3, on the same cloud used by banks and governments.",
    "trust3Title": "Verified accountability",
    "trust3Desc": "Only panchayat administrators can change complaint statuses — every change is attributed and logged."
  }
}

HI = {
  "common": {"cancel": "रद्द करें"},
  "nav": {
    "skipToContent": "मुख्य सामग्री पर जाएँ",
    "loggedOutToast": "आप साइन आउट हो गए हैं।"
  },
  "auth": {
    "welcomeBack": "वापसी पर स्वागत है, {{name}}!",
    "accountCreated": "खाता बन गया। SmartGram में आपका स्वागत है!"
  },
  "profile": {
    "title": "प्रोफ़ाइल",
    "subtitle": "ग्राम पंचायत में दर्ज आपके खाते का विवरण।",
    "userId": "उपयोगकर्ता आईडी",
    "role": "भूमिका",
    "roleAdmin": "पंचायत प्रशासक",
    "roleCitizen": "नागरिक",
    "memberSince": "सदस्य बने",
    "securityTitle": "खाता सुरक्षा",
    "securityDesc": "आपका पासवर्ड केवल वन-वे हैश के रूप में संग्रहीत है और आपका सत्र एन्क्रिप्टेड, HTTP-only कुकी से सुरक्षित है। खाता विवरण अपडेट कराने के लिए पंचायत कार्यालय से संपर्क करें।",
    "loggedOut": "साइन आउट हो गए।"
  },
  "detail": {
    "pageTitle": "शिकायत विवरण",
    "statusUpdated": "स्थिति {{status}} में अपडेट हुई।"
  },
  "submit": {"toastSuccess": "शिकायत सफलतापूर्वक दर्ज हुई।"},
  "notices": {
    "postNotice": "सूचना प्रकाशित करें",
    "composerTitle": "नई सूचना प्रकाशित करें",
    "createTitle": "शीर्षक",
    "createTitlePlaceholder": "जैसे: रविवार को ग्राम सभा की बैठक",
    "createCategory": "श्रेणी",
    "createContent": "सूचना विषय-वस्तु",
    "createContentPlaceholder": "पूरी सूचना यहाँ लिखें जो नागरिक पढ़ेंगे…",
    "createExpiry": "समाप्ति तिथि",
    "createExpiryHint": "वैकल्पिक — इस तिथि के बाद सूचना समाप्त दिखाई जाएगी।",
    "createSubmit": "सूचना प्रकाशित करें",
    "created": "सूचना प्रकाशित हुई।",
    "createError": "सूचना प्रकाशित नहीं हो सकी। कृपया पुनः प्रयास करें।",
    "createRequired": "शीर्षक और विषय-वस्तु आवश्यक हैं।"
  },
  "landing": {
    "trackerD1": "सोम, 2 सितं · प्रात 10:14",
    "trackerD2": "मंगल, 3 सितं · प्रात 9:02",
    "trackerD3": "गुरु, 5 सितं · अपराह्न 2:40",
    "howTitle": "यह कैसे काम करता है",
    "howSubtitle": "समस्या देखने से लेकर उसके समाधान तक — तीन सरल चरण, पूरी ट्रैकिंग के साथ।",
    "step1Title": "शिकायत दर्ज करें",
    "step1Desc": "श्रेणी चुनें, समस्या बताएँ और प्रमाण के रूप में फोटो जोड़ें। दो मिनट से भी कम समय लगता है।",
    "step2Title": "पंचायत कार्रवाई करती है",
    "step2Desc": "कर्मचारी आपकी शिकायत की समीक्षा करते हैं, सही विभाग को सौंपते हैं और काम होने पर अपडेट देते हैं।",
    "step3Title": "समाधान तक ट्रैक करें",
    "step3Desc": "दर्ज होने से लेकर समाधान तक की समयरेखा देखें। हमेशा स्पष्ट रहेगा कि मामला कहाँ खड़ा है।",
    "trackingBadge": "शिकायत ट्रैकिंग",
    "trackingTitle": "हर शिकायत का पूरा रिकॉर्ड",
    "trackingDesc": "अब अधिकारियों के पीछे भागना नहीं पड़ेगा और न ही सोचना होगा कि क्या हुआ। हर शिकायत को एक विशिष्ट आईडी और हर कार्रवाई का समयबद्ध, पारदर्शी इतिहास मिलता है।",
    "trackingPoint1": "हर शिकायत के लिए विशिष्ट आईडी",
    "trackingPoint2": "आधिकारिक टिप्पणियों के साथ समयबद्ध स्थिति इतिहास",
    "trackingPoint3": "स्थिति बदलने पर ईमेल सूचना",
    "trackingFlowTitle": "एक नज़र में स्थिति",
    "trackingAssigned": "विभाग को सौंपी गई",
    "schemesTitle": "सरकारी योजनाएँ",
    "schemesSubtitle": "केंद्रीय कल्याण योजनाएँ आसान भाषा में — क्या मिलेगा और कौन पात्र है।",
    "noticesTitle": "सूचनाएँ और अपडेट",
    "noticesSubtitle": "आपकी ग्राम पंचायत की आधिकारिक घोषणाएँ, प्रकाशित और संग्रहीत।",
    "transparencyBadge": "पारदर्शिता",
    "transparencyTitle": "डिफ़ॉल्ट रूप से पारदर्शी",
    "transparencyDesc": "सार्वजनिक रिकॉर्ड का मतलब है कि कम चीज़ें खोती हैं। शिकायतें, सूचनाएँ और योजना की जानकारी दृश्यमान और उत्तरदायी रहती है।",
    "transparencyItem1": "हर शिकायत रिकॉर्ड पर",
    "transparencyItem2": "लिखित स्थिति अपडेट",
    "transparencyItem3": "प्रकाशित सूचना संग्रह",
    "transparencyItem4": "समयबद्ध समयरेखाएँ",
    "impactBadge": "सामुदायिक प्रभाव",
    "impactTitle": "छोटी रिपोर्ट, दिखने वाला बदलाव",
    "impactDesc": "आज रिपोर्ट किया गया टूटा स्ट्रीट लाइट अगले हफ़्ते ठीक हो जाती है। जब पड़ोसी एक ही साझा प्रणाली से समस्याएँ दर्ज करते हैं, तो पंचायत पूरे गाँव के लिए सबसे ज़रूरी कामों को प्राथमिकता दे सकती है।",
    "trustBadge": "भरोसा और सुरक्षा",
    "trustTitle": "भरोसे पर बनी प्रणाली",
    "trustSubtitle": "आपकी शिकायतें और व्यक्तिगत जानकारी उतनी ही सुरक्षा पाएँ, जितनी कोई सरकारी रिकॉर्ड पाता है।",
    "trust1Title": "एन्क्रिप्टेड सत्र",
    "trust1Desc": "साइन-इन सत्र सुरक्षित, HTTP-only कुकी से चलते हैं — लॉगिन जानकारी कभी ब्राउज़र तक नहीं पहुँचती।",
    "trust2Title": "AWS इंफ्रास्ट्रक्चर",
    "trust2Desc": "डेटा Amazon DynamoDB में और मीडिया S3 में सुरक्षित रहता है — वही क्लाउड जिसका उपयोग बैंक और सरकारें करती हैं।",
    "trust3Title": "सत्यापित उत्तरदायित्व",
    "trust3Desc": "केवल पंचायत प्रशासक ही शिकायत की स्थिति बदल सकते हैं — हर बदलाव दर्ज और जिम्मेदार ठहराया जा सकता है।"
  }
}

def merge(path, patch):
    with io.open(path, encoding='utf-8') as f:
        data = json.load(f)
    for section, kv in patch.items():
        data.setdefault(section, {}).update(kv)
    with io.open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

merge('src/i18n/locales/en/translation.json', EN)
merge('src/i18n/locales/hi/translation.json', HI)
print('i18n keys merged')
