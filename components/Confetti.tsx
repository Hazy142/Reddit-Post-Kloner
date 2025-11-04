import React, { useEffect, useState } from 'react';

interface ConfettiParticle {
    id: number;
    x: number;
    y: number;
    color: string;
    size: number;
    speedX: number;
    speedY: number;
    rotation: number;
    rotationSpeed: number;
}

const colors = ['#FF006E', '#00F5FF', '#39FF14', '#FFD700', '#FF6B35', '#4ECDC4'];

export const Confetti: React.FC<{ trigger: boolean }> = ({ trigger }) => {
    const [particles, setParticles] = useState<ConfettiParticle[]>([]);

    useEffect(() => {
        if (trigger) {
            const newParticles: ConfettiParticle[] = [];
            for (let i = 0; i < 100; i++) {
                newParticles.push({
                    id: i,
                    x: Math.random() * window.innerWidth,
                    y: -10,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: Math.random() * 10 + 5,
                    speedX: (Math.random() - 0.5) * 6,
                    speedY: Math.random() * 3 + 2,
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 10,
                });
            }
            setParticles(newParticles);

            const interval = setInterval(() => {
                setParticles((prev) =>
                    prev
                        .map((p) => ({
                            ...p,
                            x: p.x + p.speedX,
                            y: p.y + p.speedY,
                            rotation: p.rotation + p.rotationSpeed,
                            speedY: p.speedY + 0.1, // Gravity
                        }))
                        .filter((p) => p.y < window.innerHeight + 50)
                );
            }, 16);

            setTimeout(() => {
                clearInterval(interval);
                setParticles([]);
            }, 3000);

            return () => clearInterval(interval);
        }
    }, [trigger]);

    if (particles.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-50">
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute"
                    style={{
                        left: `${particle.x}px`,
                        top: `${particle.y}px`,
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        backgroundColor: particle.color,
                        borderRadius: '50%',
                        transform: `rotate(${particle.rotation}deg)`,
                        boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
                    }}
                />
            ))}
        </div>
    );
};
