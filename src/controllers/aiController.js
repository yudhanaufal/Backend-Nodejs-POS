/**const { askOllama } = require('../services/ollamaServices');
const {
    getLaporanToko
} = require('../services/toolServices');

function getDateRangeFromQuestion(question, startDate, endDate) {
    if (startDate && endDate) {
        return { startDate, endDate };
    }

    const rangeMatch = question.match(
        /(?:tgl|tanggal)\s*(\d{1,2})\s*(?:sampai(?:\s+dengan)?|hingga|s\/d|sd|-)\s*(?:tgl|tanggal)?\s*(\d{1,2})/i
    );

    if (!rangeMatch) {
        return { startDate, endDate };
    }

    const now = new Date();
    const year = now.getFullYear();
    const monthMatch = question.match(/\b(?:bulan|bln)\s*(\d{1,2})\b/i);
    const requestedMonth = monthMatch ? Number(monthMatch[1]) : now.getMonth() + 1;
    const month = String(requestedMonth).padStart(2, '0');

    if (requestedMonth < 1 || requestedMonth > 12) {
        return { startDate, endDate };
    }

    return {
        startDate: startDate || `${year}-${month}-${String(rangeMatch[1]).padStart(2, '0')}`,
        endDate: endDate || `${year}-${month}-${String(rangeMatch[2]).padStart(2, '0')}`
    };
}

exports.chat = async (req, res) => {
    try {
        const { question, start_date, end_date } = req.body;
        const dateRange = getDateRangeFromQuestion(
            question,
            start_date,
            end_date
        );

        if (
            question.toLowerCase().includes('laporan') &&
            question.toLowerCase().includes('penjualan')
        ) {
            const data =
                await getLaporanToko(
                    dateRange.startDate,
                    dateRange.endDate
                );

            const prompt = `
Pertanyaan:
${question}

Data:
${JSON.stringify(data)}

Buat jawaban yang mudah dipahami pemilik toko.
`;

            const result =
                await askOllama(prompt);

            return res.json({
                success: true,
                answer: result.response
            });
        }

        const result =
            await askOllama(question);

        res.json({
            success: true,
            answer: result.response
        });
    } catch (err) {
        console.log(err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};**/