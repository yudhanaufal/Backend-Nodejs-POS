/*const { askOllama } = require('../services/ollamaServices');
const {
    getLaporanToko
} = require('../services/toolServices');

exports.chat = async (req, res) => {
    try {
        const { question, start_date, end_date } = req.body;

        if (
            question.toLowerCase().includes('laporan') &&
            question.toLowerCase().includes('penjualan')
        ) {
            const data =
                await getLaporanToko(
                    start_date,
                    end_date
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
};*/