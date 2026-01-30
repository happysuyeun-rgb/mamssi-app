export type FlowerData = {
  title: string;
  date: string;
  water?: number;
  emoji: string;
  message?: string;
};

export function drawFlowerCanvas(canvas: HTMLCanvasElement, data: FlowerData) {
  const g = canvas.getContext('2d');
  if (!g) return;
  g.clearRect(0, 0, canvas.width, canvas.height);

  const grad = g.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#e2f7ee');
  g.fillStyle = grad;
  g.fillRect(0, 0, canvas.width, canvas.height);

  g.fillStyle = '#0f766e';
  g.font = '700 28px system-ui';
  g.fillText(data.title, 24, 44);

  g.font = '84px serif';
  g.fillText(data.emoji, 24, 132);

  g.fillStyle = '#065f46';
  g.font = '600 18px system-ui';
  g.fillText('개화: ' + data.date, 24, 176);

  const message = (data.message ?? '').trim();
  if (message) {
    g.fillStyle = '#0f4233';
    g.font = '500 20px system-ui';
    const text = `“${message}”`;
    g.fillText(text, 24, 210);
  }

  g.fillStyle = '#7cc49b';
  g.fillRect(canvas.width - 190, canvas.height - 54, 170, 36);
  g.fillStyle = '#064e3b';
  g.font = '700 16px system-ui';
  g.fillText('마음씨 · 감정꽃', canvas.width - 182, canvas.height - 32);
}
