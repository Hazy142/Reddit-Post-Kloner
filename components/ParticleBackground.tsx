import React, { useEffect, useState } from 'react';

interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    color: string;
    opacity: number;
}

const colors = ['#FF006E', '#00F5FF', '#39FF14'];

export const ParticleBackground: React.FC = () => {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        const particleCount = 30;
        const newParticles: Particle[] = [];

        for (let i = 0; i < particleCount; i++) {
            newParticles.push({
                id: i,
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 3 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                color: colors[Math.floor(Math.random() * colors.length)],
                opacity: Math.random() * 0.3 + 0.1,
            });
        }

        setParticles(newParticles);

        const animate = () => {
            setParticles((prev) =>
                prev.map((p) => {
                    let newX = p.x + p.speedX;
                    let newY = p.y + p.speedY;

                    if (newX < 0 || newX > window.innerWidth) p.speedX *= -1;
                    if (newY < 0 || newY > window.innerHeight) p.speedY *= -1;

                    return {
                        ...p,
                        x: newX < 0 ? 0 : newX > window.innerWidth ? window.innerWidth : newX,
                        y: newY < 0 ? 0 : newY > window.innerHeight ? window.innerHeight : newY,
                        speedX: (newX < 0 || newX > window.innerWidth) ? -p.speedX : p.speedX,
                        speedY: (newY < 0 || newY > window.innerHeight) ? -p.speedY : p.speedY,
                    };
                })
            );
        };

        const interval = setInterval(animate, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute rounded-full"
                    style={{
                        left: `${particle.x}px`,
                        top: `${particle.y}px`,
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        backgroundColor: particle.color,
                        opacity: particle.opacity,
                        boxShadow: `0 0 ${particle.size * 4}px ${particle.color}`,
                    }}
                />
            ))}
        </div>
    );
};
