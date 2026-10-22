import { createRoot } from 'react-dom/client';
import TopDownShooterGame from './app/page';

// Same game as the Next page, mounted without a server or hydration.
createRoot(document.getElementById('game-root')!).render(<TopDownShooterGame />);
