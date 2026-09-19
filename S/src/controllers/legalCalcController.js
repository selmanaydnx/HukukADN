const {
  calculateProceduralDeadline,
  calculateUetsLegalServiceDate,
  calculateSMM,
  calculateExecutionCover,
  calculateAAUT
} = require('../utils/proceduralRules');

function calculateDeadlineApi(req, res) {
  try {
    const { baseDate, ruleType, customDays, isUets } = req.body;
    if (!baseDate) {
      return res.status(400).json({ error: 'Başlangıç / tebliğ tarihi zorunludur.' });
    }

    let actualBaseDate = baseDate;
    let uetsInfo = null;

    if (isUets) {
      const uetsServiceDate = calculateUetsLegalServiceDate(baseDate);
      uetsInfo = {
        arrivalDate: baseDate,
        legalServiceDate: uetsServiceDate,
        rule: 'Tebligat K. m. 7/a uyarınca tebligat, adrese ulaştığı tarihi izleyen 5. günün sonunda tebliğ edilmiş sayılır.'
      };
      actualBaseDate = uetsServiceDate;
    }

    const result = calculateProceduralDeadline(actualBaseDate, ruleType, customDays);
    res.json({
      success: true,
      uets: uetsInfo,
      calculation: result
    });
  } catch (err) {
    res.status(500).json({ error: 'Süre hesaplanırken hata oluştu: ' + err.message });
  }
}

function calculateSmmApi(req, res) {
  try {
    const { calculationType, amount, vatRate, withholdingRate, withholdingDeduction } = req.body;
    if (amount === undefined || amount === null || isNaN(parseFloat(amount))) {
      return res.status(400).json({ error: 'Geçerli bir tutar girilmelidir.' });
    }

    const result = calculateSMM({
      calculationType,
      amount: parseFloat(amount),
      vatRate,
      withholdingRate,
      withholdingDeduction
    });

    res.json({
      success: true,
      smm: result
    });
  } catch (err) {
    res.status(500).json({ error: 'SMM hesaplanırken hata oluştu: ' + err.message });
  }
}

function calculateExecutionCoverApi(req, res) {
  try {
    const {
      principal,
      startDateStr,
      calcDateStr,
      interestType,
      customInterestRate,
      expenses,
      stage,
      partialPayments
    } = req.body;

    if (principal === undefined || principal === null || isNaN(parseFloat(principal))) {
      return res.status(400).json({ error: 'Geçerli bir asıl alacak tutarı girilmelidir.' });
    }

    const result = calculateExecutionCover({
      principal: parseFloat(principal),
      startDateStr,
      calcDateStr,
      interestType,
      customInterestRate: parseFloat(customInterestRate) || 0,
      expenses: parseFloat(expenses) || 0,
      stage,
      partialPayments: parseFloat(partialPayments) || 0
    });

    res.json({
      success: true,
      execution: result
    });
  } catch (err) {
    res.status(500).json({ error: 'İcra kapak hesabı yapılırken hata oluştu: ' + err.message });
  }
}

function calculateAautApi(req, res) {
  try {
    const { claimAmount, courtType } = req.body;
    if (claimAmount === undefined || claimAmount === null || isNaN(parseFloat(claimAmount))) {
      return res.status(400).json({ error: 'Geçerli bir dava değeri tutarı girilmelidir.' });
    }

    const result = calculateAAUT({
      claimAmount: parseFloat(claimAmount),
      courtType
    });

    res.json({
      success: true,
      aaut: result
    });
  } catch (err) {
    res.status(500).json({ error: 'AAÜT hesaplanırken hata oluştu: ' + err.message });
  }
}

module.exports = {
  calculateDeadlineApi,
  calculateSmmApi,
  calculateExecutionCoverApi,
  calculateAautApi
};
