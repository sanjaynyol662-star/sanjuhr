// CSC services catalog for frontend (mirrors backend csc_services.py)
import {
  FaIdCard, FaFileSignature, FaUniversity, FaBolt, FaTrain, FaHeartbeat,
  FaGraduationCap, FaCar, FaListAlt,
} from "react-icons/fa";

const ICONS = {
  FaIdCard, FaFileSignature, FaUniversity, FaBolt, FaTrain, FaHeartbeat,
  FaGraduationCap, FaCar, FaListAlt,
};

export const CSC_CATEGORIES = [
  {
    id: "vacancy", hi: "ऑनलाइन फॉर्म · नई भर्ती", en: "Online Forms · New Vacancy", icon: FaIdCard,
    services: [
      { id: "ssc_cgl", hi: "SSC CGL / CHSL / MTS", en: "SSC CGL / CHSL / MTS", fee: 0 },
      { id: "railway_rrb", hi: "रेलवे भर्ती (RRB / NTPC / Group D)", en: "Railway (RRB / NTPC / Group D)", fee: 0 },
      { id: "upsc", hi: "UPSC (सिविल सेवा)", en: "UPSC (Civil Services)", fee: 0 },
      { id: "hssc", hi: "HSSC / HPSC (हरियाणा)", en: "HSSC / HPSC (Haryana)", fee: 0 },
      { id: "ibps_bank", hi: "बैंक PO / क्लर्क (IBPS / SBI)", en: "Bank PO / Clerk (IBPS / SBI)", fee: 0 },
      { id: "police", hi: "पुलिस भर्ती (Haryana / SSC GD)", en: "Police (Haryana / SSC GD)", fee: 0 },
      { id: "army_navy", hi: "आर्मी / नेवी / एयरफोर्स", en: "Army / Navy / Air Force", fee: 0 },
      { id: "teacher_tet", hi: "TET / CTET / HTET (शिक्षक)", en: "TET / CTET / HTET (Teacher)", fee: 0 },
      { id: "patwari", hi: "पटवारी / नायब तहसीलदार", en: "Patwari / Naib Tehsildar", fee: 0 },
      { id: "anganwadi", hi: "आँगनवाड़ी वर्कर/हेल्पर", en: "Anganwadi Worker/Helper", fee: 0 },
      { id: "clat_neet", hi: "NEET / JEE / CLAT / CUET", en: "NEET / JEE / CLAT / CUET", fee: 0 },
      { id: "hpcl_ongc", hi: "PSU (HPCL/ONGC/IOCL/GAIL)", en: "PSU (HPCL/ONGC/IOCL/GAIL)", fee: 0 },
      { id: "other_vacancy", hi: "अन्य सरकारी भर्ती", en: "Other Government Vacancy", fee: 0 },
    ],
  },
  {
    id: "identity", hi: "पहचान दस्तावेज़", en: "Identity & Documents", icon: FaIdCard,
    services: [
      { id: "aadhaar_new", hi: "आधार नया पंजीकरण", en: "New Aadhaar Enrolment", fee: 50 },
      { id: "aadhaar_update", hi: "आधार अपडेट/करेक्शन", en: "Aadhaar Update / Correction", fee: 50 },
      { id: "aadhaar_download", hi: "e-आधार डाउनलोड / प्रिंट", en: "e-Aadhaar Download / Print", fee: 20 },
      { id: "pan_new", hi: "PAN कार्ड (नया)", en: "New PAN Card", fee: 130 },
      { id: "pan_correction", hi: "PAN करेक्शन", en: "PAN Correction", fee: 130 },
      { id: "passport", hi: "पासपोर्ट आवेदन", en: "Passport Application", fee: 100 },
      { id: "voter_id", hi: "वोटर आईडी", en: "Voter ID Card", fee: 40 },
    ],
  },
  {
    id: "certificates", hi: "सरकारी प्रमाणपत्र", en: "Government Certificates", icon: FaFileSignature,
    services: [
      { id: "birth_cert", hi: "जन्म प्रमाण पत्र", en: "Birth Certificate", fee: 60 },
      { id: "death_cert", hi: "मृत्यु प्रमाण पत्र", en: "Death Certificate", fee: 60 },
      { id: "income_cert", hi: "आय प्रमाण पत्र", en: "Income Certificate", fee: 50 },
      { id: "caste_cert", hi: "जाति प्रमाण पत्र", en: "Caste Certificate", fee: 50 },
      { id: "domicile_cert", hi: "मूल निवास प्रमाण पत्र", en: "Domicile Certificate", fee: 50 },
      { id: "marriage_cert", hi: "विवाह प्रमाण पत्र", en: "Marriage Certificate", fee: 80 },
      { id: "ews_cert", hi: "EWS प्रमाण पत्र", en: "EWS Certificate", fee: 50 },
    ],
  },
  {
    id: "banking", hi: "बैंकिंग एवं बीमा", en: "Banking & Insurance", icon: FaUniversity,
    services: [
      { id: "pmjjby", hi: "PMJJBY (जीवन ज्योति बीमा) ₹436/वर्ष", en: "PMJJBY (Life Insurance) ₹436/yr", fee: 20 },
      { id: "pmsby", hi: "PMSBY (सुरक्षा बीमा) ₹20/वर्ष", en: "PMSBY (Accident Cover) ₹20/yr", fee: 20 },
      { id: "apy", hi: "अटल पेंशन योजना (APY)", en: "Atal Pension Yojana", fee: 20 },
      { id: "lic", hi: "LIC प्रीमियम भुगतान", en: "LIC Premium Payment", fee: 15 },
      { id: "cscpay", hi: "AEPS / माइक्रो ATM (बैंक कैश)", en: "AEPS / Micro-ATM Withdraw", fee: 10 },
      { id: "pmkisan", hi: "PM Kisan पंजीकरण / eKYC", en: "PM Kisan Registration / eKYC", fee: 30 },
    ],
  },
  {
    id: "bills", hi: "बिल भुगतान एवं रिचार्ज", en: "Bill Payment & Recharge", icon: FaBolt,
    services: [
      { id: "electricity_bill", hi: "बिजली बिल भुगतान (DHBVN/UHBVN)", en: "Electricity Bill (DHBVN/UHBVN)", fee: 10 },
      { id: "water_bill", hi: "पानी का बिल", en: "Water Bill", fee: 10 },
      { id: "gas_bill", hi: "गैस बिल (HP/Indane/Bharat)", en: "LPG Gas Bill", fee: 10 },
      { id: "mobile_recharge", hi: "मोबाइल / DTH रिचार्ज", en: "Mobile / DTH Recharge", fee: 5 },
      { id: "fastag", hi: "FASTag खरीद / रिचार्ज", en: "FASTag Purchase / Recharge", fee: 25 },
      { id: "insurance_prem", hi: "जनरल इंश्योरेंस प्रीमियम", en: "General Insurance Premium", fee: 15 },
    ],
  },
  {
    id: "travel", hi: "यात्रा एवं टिकट", en: "Travel & Tickets", icon: FaTrain,
    services: [
      { id: "irctc", hi: "IRCTC रेल टिकट", en: "IRCTC Train Ticket", fee: 30 },
      { id: "bus_ticket", hi: "बस टिकट (HRTC/RSRTC)", en: "Bus Ticket (HRTC/RSRTC)", fee: 30 },
      { id: "flight", hi: "फ्लाइट बुकिंग", en: "Flight Booking", fee: 100 },
      { id: "hotel", hi: "होटल बुकिंग", en: "Hotel Booking", fee: 50 },
    ],
  },
  {
    id: "health", hi: "स्वास्थ्य सेवाएँ", en: "Health Services", icon: FaHeartbeat,
    services: [
      { id: "ayushman", hi: "आयुष्मान भारत कार्ड", en: "Ayushman Bharat Card", fee: 30 },
      { id: "abha", hi: "ABHA (हेल्थ ID) पंजीकरण", en: "ABHA (Health ID) Registration", fee: 20 },
      { id: "eshram", hi: "e-Shram कार्ड (श्रमिक)", en: "e-Shram Card (Workers)", fee: 20 },
    ],
  },
  {
    id: "education", hi: "शिक्षा", en: "Education", icon: FaGraduationCap,
    services: [
      { id: "nios", hi: "NIOS (10वीं/12वीं) एडमिशन", en: "NIOS 10th/12th Admission", fee: 100 },
      { id: "ignou", hi: "IGNOU एडमिशन", en: "IGNOU Admission", fee: 100 },
      { id: "scholarship", hi: "छात्रवृत्ति आवेदन", en: "Scholarship Application", fee: 40 },
      { id: "typing_cert", hi: "टाइपिंग सर्टिफिकेट (CCC)", en: "CCC / Typing Certificate", fee: 500 },
    ],
  },
  {
    id: "vehicle", hi: "वाहन एवं परिवहन", en: "Vehicle & Transport", icon: FaCar,
    services: [
      { id: "dl_new", hi: "ड्राइविंग लाइसेंस (नया)", en: "Driving Licence (New)", fee: 200 },
      { id: "dl_renewal", hi: "DL रिन्यूअल", en: "DL Renewal", fee: 150 },
      { id: "rc_transfer", hi: "RC ट्रांसफर", en: "RC Transfer", fee: 200 },
      { id: "pollution_cert", hi: "प्रदूषण प्रमाणपत्र (PUC)", en: "Pollution Certificate (PUC)", fee: 100 },
    ],
  },
  {
    id: "other", hi: "अन्य e-सेवाएँ", en: "Other e-Services", icon: FaListAlt,
    services: [
      { id: "land_record", hi: "जमाबंदी / भू-नक्शा", en: "Land Records / Jamabandi", fee: 30 },
      { id: "ration_new", hi: "राशन कार्ड (नया)", en: "New Ration Card", fee: 50 },
      { id: "pension", hi: "वृद्धावस्था पेंशन आवेदन", en: "Old Age Pension Application", fee: 40 },
      { id: "tele_law", hi: "Tele-Law परामर्श", en: "Tele-Law Consultation", fee: 30 },
      { id: "photocopy", hi: "फोटोकॉपी / प्रिंट / स्कैन", en: "Photocopy / Print / Scan", fee: 5 },
      { id: "other_custom", hi: "अन्य (कस्टम)", en: "Other (Custom)", fee: 0 },
    ],
  },
];

export const findService = (id) => {
  for (const cat of CSC_CATEGORIES) {
    const s = cat.services.find(s => s.id === id);
    if (s) return { service: s, category: cat };
  }
  return { service: null, category: null };
};
