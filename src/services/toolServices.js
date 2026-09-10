/**async function getLaporanToko(
    startDate,
    endDate
) {
    if (!startDate || !endDate) {
        throw new Error('Rentang tanggal laporan wajib diisi');
    }

    const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
    });
    const response = await fetch(
        `http://localhost:3000/api/laporan/laporantoko/?${params}`
    );

    if (!response.ok) {
        throw new Error(`Gagal mengambil laporan toko (${response.status})`);
    }

    return await response.json();
}

module.exports = {
    getLaporanToko
};**/