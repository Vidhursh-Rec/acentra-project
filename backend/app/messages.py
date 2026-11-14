"""Fixed patient-facing messages in EN / TA / HI. Templates only — no LLM."""

MESSAGES = {
    "UNREADABLE": {
        "en": "The document is too blurry or unclear to read. Please upload a clearer photo or PDF.",
        "ta": "ஆவணம் மிகவும் மங்கலாக உள்ளது அல்லது படிக்க முடியவில்லை. தெளிவான புகைப்படம் அல்லது PDF-ஐ பதிவேற்றவும்.",
        "hi": "दस्तावेज़ बहुत धुंधला है या पढ़ा नहीं जा सकता। कृपया साफ़ फ़ोटो या PDF अपलोड करें।",
    },
    "NOT_DISCHARGE": {
        "en": "This document is not a discharge summary. Please upload the discharge summary given by the hospital.",
        "ta": "இந்த ஆவணம் டிஸ்சார்ஜ் சுருக்கம் அல்ல. மருத்துவமனை வழங்கிய டிஸ்சார்ஜ் சுருக்கத்தை பதிவேற்றவும்.",
        "hi": "यह दस्तावेज़ डिस्चार्ज सारांश नहीं है। कृपया अस्पताल द्वारा दिया गया डिस्चार्ज सारांश अपलोड करें।",
    },
    "PATIENT_DETAILS_MISSING": {
        "en": "Patient details (name or patient ID) are missing in this document.",
        "ta": "இந்த ஆவணத்தில் நோயாளியின் விவரங்கள் (பெயர் அல்லது நோயாளி ID) இல்லை.",
        "hi": "इस दस्तावेज़ में मरीज़ का विवरण (नाम या मरीज़ ID) नहीं है।",
    },
    "PATIENT_MISMATCH": {
        "en": "This summary belongs to a different patient.",
        "ta": "இந்த சுருக்கம் வேறொரு நோயாளிக்கு உரியது.",
        "hi": "यह सारांश किसी दूसरे मरीज़ का है।",
    },
    "NO_INSTRUCTIONS": {
        "en": "No medicines or follow-up instructions were found in this document.",
        "ta": "இந்த ஆவணத்தில் மருந்துகள் அல்லது தொடர் சிகிச்சை வழிமுறைகள் எதுவும் இல்லை.",
        "hi": "इस दस्तावेज़ में कोई दवा या फ़ॉलो-अप निर्देश नहीं मिले।",
    },
    "PROCESSING_FAILED": {
        "en": "We could not process this document. Please try uploading again.",
        "ta": "இந்த ஆவணத்தை செயலாக்க முடியவில்லை. மீண்டும் பதிவேற்ற முயற்சிக்கவும்.",
        "hi": "हम इस दस्तावेज़ को प्रोसेस नहीं कर सके। कृपया फिर से अपलोड करें।",
    },
    "UNSUPPORTED_FILE": {
        "en": "Please upload a PDF, image (JPG or PNG) or text file under 10 MB.",
        "ta": "10 MB-க்கு குறைவான PDF, படம் (JPG அல்லது PNG) அல்லது உரை கோப்பை பதிவேற்றவும்.",
        "hi": "कृपया 10 MB से छोटी PDF, इमेज (JPG या PNG) या टेक्स्ट फ़ाइल अपलोड करें।",
    },
    "ALREADY_UPLOADED": {
        "en": "Your discharge summary is already uploaded.",
        "ta": "உங்கள் டிஸ்சார்ஜ் சுருக்கம் ஏற்கனவே பதிவேற்றப்பட்டுள்ளது.",
        "hi": "आपका डिस्चार्ज सारांश पहले ही अपलोड हो चुका है।",
    },
}


def message(code: str, language: str) -> str:
    texts = MESSAGES[code]
    return texts.get(language, texts["en"])
