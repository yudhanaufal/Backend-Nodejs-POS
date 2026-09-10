/**async function askOllama(question) {
    const response = await fetch(
        'http://localhost:11434/api/generate',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'qwen3.5:9b-mlx',
                prompt: question,
                stream: false
            })
        }
    );

    const data = await response.json();

    console.log(data);

    return data;
}

 module.exports = {
    askOllama
};**/