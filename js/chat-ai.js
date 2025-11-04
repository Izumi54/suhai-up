    // AI Chat Management dengan n8n Integration - DEBUG VERSION
    const ChatAI = {
        init() {
            console.log('ChatAI.init() dipanggil');
            this.setupChatElements();
            this.setupEventListeners();
            this.showWelcomeMessage();
            console.log('ChatAI initialized');
        },

        setupChatElements() {
            console.log('Setup chat elements...');
            this.elements = {
                chatToggle: document.getElementById('chatToggle'),
                chatWindow: document.getElementById('chatWindow'),
                chatIcon: document.getElementById('chatIcon'),
                closeIcon: document.getElementById('closeIcon'),
                chatBadge: document.getElementById('chatBadge'),
                minimizeChat: document.getElementById('minimizeChat'),
                chatInput: document.getElementById('chatInput'),
                sendMessage: document.getElementById('sendMessage'),
                chatMessages: document.getElementById('chatMessages')
            };
            
            // Log jika elemen tidak ditemukan
            Object.entries(this.elements).forEach(([key, element]) => {
                if (!element) {
                    console.warn(`Element ${key} tidak ditemukan`);
                }
            });
            
            this.state = {
                isOpen: false,
                hasNewMessage: true,
                isTyping: false,
                n8nEnabled: true
            };
            console.log('Chat elements setup completed');
        },

        // 
        setupEventListeners() {
            console.log('🔧 Setup Event Listeners...');
            
            // 🎯 FIX 1: GUNAKAN ARROW FUNCTION UNTUK PERTAHANKAN 'this'
            const handleSendMessage = () => {
                console.log('🎯 Tombol kirim diklik!');
                this.sendMessage();
            };

            const handleEnterKey = (ev) => {
                if (ev.key === 'Enter') {
                    console.log('🎯 Enter ditekan!');
                    this.sendMessage();
                }
            };

            const handleChatToggle = () => {
                console.log('🎯 Chat toggle diklik');
                this.toggleChat();
            };

            const handleQuickAction = (e) => {
                const action = e.target.dataset.action;
                console.log('🎯 Quick action:', action);
                this.handleQuickAction(action);
            };

            // 🎯 FIX 2: PASANG EVENT LISTENER DENGAN CARA YANG BENAR
            if (this.elements.sendMessage) {
                // Hapus event listener lama (jika ada)
                this.elements.sendMessage.removeEventListener('click', handleSendMessage);
                // Pasang yang baru
                this.elements.sendMessage.addEventListener('click', handleSendMessage);
                console.log('✅ Event listener tombol kirim dipasang');
            }

            if (this.elements.chatInput) {
                this.elements.chatInput.removeEventListener('keypress', handleEnterKey);
                this.elements.chatInput.addEventListener('keypress', handleEnterKey);
                console.log('✅ Event listener input dipasang');
            }

            if (this.elements.chatToggle) {
                this.elements.chatToggle.removeEventListener('click', handleChatToggle);
                this.elements.chatToggle.addEventListener('click', handleChatToggle);
                console.log('✅ Event listener chat toggle dipasang');
            }

            // Quick action buttons
            document.querySelectorAll('.quick-action-btn').forEach(btn => {
                btn.removeEventListener('click', handleQuickAction);
                btn.addEventListener('click', handleQuickAction);
            });
            console.log('✅ Event listener quick actions dipasang');
            
            console.log('🎉 Semua event listeners berhasil dipasang!');
        },
        async sendMessage() {
            console.log('🚀 sendMessage() DIPANGGIL');
            
            const message = this.elements.chatInput.value.trim();
            console.log('💬 Message:', message);
            
            if (!message) {
                console.log('❌ Message kosong, return');
                return;
            }

            // Add user message
            this.addMessage(message, 'user');
            this.elements.chatInput.value = '';
            console.log('✅ User message ditambahkan');

            // Show typing indicator
            this.showTypingIndicator();
            console.log('⌛ Typing indicator ditampilkan');

            try {
                let aiResponse;
                
                if (this.state.n8nEnabled) {
                    console.log('🌐 Menggunakan n8n...');
                    aiResponse = await this.sendMessageToN8N(message);
                } else {
                    console.log('🔧 Menggunakan fallback local...');
                    aiResponse = this.generateAIResponse(message);
                }
                
                this.hideTypingIndicator();
                console.log('🤖 AI Response diterima:', aiResponse);
                this.addMessage(aiResponse, 'ai');
                
            } catch (error) {
                console.error('💥 Error di sendMessage:', error);
                this.hideTypingIndicator();
                const fallbackResponse = this.generateAIResponse(message);
                this.addMessage(fallbackResponse, 'ai');
            }
        },

        getUserId() {
            let userId = localStorage.getItem('chatUserId');
            if (!userId) {
                userId = 'user_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('chatUserId', userId);
            }
            return userId;
        },

        // ==================== MODIFIED FUNCTIONS ====================

        async sendMessageToN8N(userMessage, context = {}) {
            const n8nWebhookURL = 'https://izumi54.app.n8n.cloud/webhook-test/chat-bot-suhAI';
            
            console.log('🚀 Mengirim ke n8n...');
            
            // 🎯 PAYLOAD YANG LEBIH DETAIL
            const payload = {
                message: userMessage,
                userId: this.getUserId(),
                location: window.WeatherData?.current?.location || 'Jepara',
                currentWeather: window.WeatherData?.current || {},
                currentTemp: window.WeatherData?.current?.temperature || 34,
                currentCondition: window.WeatherData?.current?.condition || 'Cerah Berawan',
                timestamp: new Date().toISOString(),
                source: 'suhAI-chat',
                ...context
            };

            console.log('📦 Payload ke n8n:', payload);

            try {
                // 🎯 TIMEOUT HANDLING (10 detik)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const response = await fetch(n8nWebhookURL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                console.log('✅ Response status:', response.status);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('🎉 Response SUCCESS dari n8n:', data);
                
                // 🎯 FLEKSIBEL RESPONSE DARI n8n
                if (data.response) {
                    return data.response;
                } else if (data.text) {
                    return data.text;
                } else if (data.answer) {
                    return data.answer;
                } else if (data.data && data.data.text) {
                    return data.data.text;
                } else {
                    console.warn('⚠️ Format n8n tidak dikenali:', data);    
                    return this.generateAIResponse(userMessage);
                }
                
            } catch (error) {
                console.error('❌ n8n API Error:', error);
                console.log('🔄 Fallback ke response lokal...');
                return this.generateAIResponse(userMessage);
            }
        },

        
        async handleQuickAction(action) {
            console.log('⚡ Quick action:', action);
            
            const messages = {
                weather: `🌤️ Bagaimana cuaca di ${window.WeatherData?.current?.location || 'Jepara'} saat ini?`,
                forecast: "📅 Apa prediksi cuaca 7 hari ke depan?",
                recommendations: "💡 Berikan rekomendasi untuk kondisi cuaca saat ini",
                health: "🏥 Tips kesehatan untuk cuaca seperti ini"
            };
            
            const message = messages[action] || "Halo!";
            this.addMessage(message, 'user');
            
            this.showTypingIndicator();
            
            try {
                let aiResponse;
                
                if (this.state.n8nEnabled) {
                    // 🎯 KIRIM CONTEXT LEBIH DETAIL KE n8n
                    aiResponse = await this.sendMessageToN8N(message, { 
                        quickAction: action,
                        currentTemp: window.WeatherData?.current?.temperature,
                        currentLocation: window.WeatherData?.current?.location,
                        currentCondition: window.WeatherData?.current?.condition
                    });
                } else {
                    aiResponse = this.generateAIResponse(message);
                }
                
                this.hideTypingIndicator();
                this.addMessage(aiResponse, 'ai');
            } catch (error) {
                console.error('❌ Error di handleQuickAction:', error);
                this.hideTypingIndicator();
                const fallbackResponse = this.generateAIResponse(message);
                this.addMessage(fallbackResponse, 'ai');
            }
        },

        // ... (rest of the functions remain the same as previous version)
        // Keep all the existing functions: toggleChat, openChat, closeChat, 
        // addMessage, showTypingIndicator, hideTypingIndicator, etc.
        
        // TAMBAHKAN function yang mungkin missing:
        toggleChat() {
            console.log('toggleChat dipanggil');
            this.state.isOpen = !this.state.isOpen;
            
            if (this.state.isOpen) {
                this.openChat();
            } else {
                this.closeChat();
            }
        },

        
        openChat() {
            console.log('openChat dipanggil');
            this.elements.chatWindow.classList.remove('hidden');
            this.elements.chatIcon.classList.add('hidden');
            this.elements.closeIcon.classList.remove('hidden');
            this.elements.chatBadge.classList.add('hidden');
            this.state.hasNewMessage = false;
            this.elements.chatInput.focus();
        },
        
        closeChat() {
            console.log('CloseChat dipanggil');
            this.elements.chatWindow.classList.add('hidden');
            this.elements.chatIcon.classList.remove('hidden');
            this.elements.closeIcon.classList.add('hidden');
            this.state.isOpen = false;
        },

        formatAIResponse(text) {
        // Format response agar lebih rapi dengan line breaks
            return text.replace(/\n/g, '<br>');
        },

        addMessage(text, sender) {
            console.log(`💬 addMessage: ${sender} - ${text.substring(0, 50)}...`);
            const messageDiv = document.createElement('div');
            messageDiv.className = 'chat-message flex items-start space-x-2';
            
            const formattedText = this.formatAIResponse(text);
            
            if (sender === 'user') {
                messageDiv.innerHTML = `
                    <div class="flex-1"></div>
                    <div class="glassmorphism-light rounded-2xl rounded-tr-sm p-3 max-w-xs">
                        <div class="text-mode text-sm">${text}</div>
                    </div>
                `;
            } else {
                messageDiv.innerHTML = `
                    <div class="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg class="w-3 h-3 text-mode" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                        </svg>
                    </div>
                    <div class="glassmorphism-light rounded-2xl rounded-tl-sm p-3 max-w-xs">
                        <div class="text-mode text-sm whitespace-pre-line">${formattedText}</div>
                    </div>
                `;
            }
            
            this.elements.chatMessages.appendChild(messageDiv);
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
            
            // Show notification badge if chat is closed
            if (!this.state.isOpen && sender === 'ai') {
                this.elements.chatBadge.classList.remove('hidden');
                this.state.hasNewMessage = true;
            }
        },

        showTypingIndicator() {
            console.log('showTypingIndicator');
            if (this.state.isTyping) return;
            
            this.state.isTyping = true;
            const typingDiv = document.createElement('div');
            typingDiv.className = 'chat-message flex items-start space-x-2';
            typingDiv.id = 'typingIndicator';
            
            typingDiv.innerHTML = `
                <div class="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="w-3 h-3 text-mode" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                </div>
                <div class="glassmorphism-light rounded-2xl rounded-tl-sm p-3">
                    <div class="flex space-x-1">
                        <div class="w-2 h-2 bg-white rounded-full typing-indicator"></div>
                        <div class="w-2 h-2 bg-white rounded-full typing-indicator" style="animation-delay: 0.2s"></div>
                        <div class="w-2 h-2 bg-white rounded-full typing-indicator" style="animation-delay: 0.4s"></div>
                    </div>
                </div>
            `;
            
            this.elements.chatMessages.appendChild(typingDiv);
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        },

        hideTypingIndicator() {
            console.log('hideTypingIndicator');
            const typingIndicator = document.getElementById('typingIndicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
            this.state.isTyping = false;
        },

        generateAIResponse(userMessage) {
            console.log('🤖 Menggunakan AI fallback lokal');
            
            const currentWeather = window.WeatherData?.current || {};
            const lowerMessage = userMessage.toLowerCase();
            
            // 🎯 RESPONSE BERDASARKAN PESAN USER
            if (lowerMessage.includes('cuaca') || lowerMessage.includes('weather')) {
                return `🌤️ Berdasarkan data terbaru, suhu di ${currentWeather.location || 'Jepara'} adalah ${currentWeather.temperature || 34}°C dengan kondisi ${currentWeather.condition || 'Cerah Berawan'}. Kelembapan ${currentWeather.humidity || 75}% dan angin ${currentWeather.windSpeed || 12} km/jam.`;
            
            } else if (lowerMessage.includes('rekomendasi') || lowerMessage.includes('saran')) {
                return `💡 Untuk cuaca saat ini (${currentWeather.temperature || 34}°C), saya sarankan:\n• Minum air putih lebih banyak\n• Gunakan pakaian yang nyaman\n• Hindari aktivitas berat di jam panas\n• Gunakan tabir surya jika keluar rumah`;
            
            } else if (lowerMessage.includes('besok') || lowerMessage.includes('prediksi')) {
                const forecast = window.WeatherData?.forecast?.[1];
                return `📅 Prediksi besok: ${forecast ? `Suhu ${forecast.high}°C / ${forecast.low}°C, ${forecast.condition}` : 'Data prediksi sedang tidak tersedia'}`;
            
            } else if (lowerMessage.includes('panas') || lowerMessage.includes('gerah')) {
                return `🔥 Wah, memang sedang panas! Suhu ${currentWeather.temperature || 34}°C terasa seperti ${currentWeather.feelsLike || 39}°C. Tips:\n• Minum air setiap 30 menit\n• Cari tempat teduh\n• Gunakan kipas/AC\n• Pakai pakaian berbahan katun`;
            
            } else if (lowerMessage.includes('hujan') || lowerMessage.includes('ujan')) {
                return `🌧️ Saat ini kondisi ${currentWeather.condition || 'Cerah Berawan'}. Untuk antisipasi hujan:\n• Bawa payung/ponsel\n• Hindari daerah rawan banjir\n• Periksa saluran air`;
            
            } else if (lowerMessage.includes('halo') || lowerMessage.includes('hai') || lowerMessage.includes('hi')) {
                return `👋 Halo! Saya SuhAI Assistant. Saya bisa membantu dengan:\n• Info cuaca terkini\n• Prediksi 7 hari\n• Rekomendasi kesehatan\n• Tips berdasarkan kondisi cuaca\n\nAda yang bisa saya bantu?`;
            
            } else {
                return `🤔 Maaf, saya tidak mengerti pertanyaan "${userMessage}". Coba tanya tentang:\n• Cuaca saat ini\n• Prediksi besok\n• Rekomendasi kesehatan\n• Tips cuaca panas/hujan\n\nAtau coba lagi dalam beberapa saat untuk koneksi yang lebih baik.`;
            }
        },

        getQuickActionMessage(action) {
            const messages = {
                weather: "Bagaimana cuaca hari ini?",
                forecast: "Apa prediksi cuaca 7 hari ke depan?",
                recommendations: "Berikan rekomendasi untuk cuaca saat ini",
                health: "Tips kesehatan untuk cuaca panas"
            };
            return messages[action] || "Halo!";
        },

        showWelcomeMessage() {
            setTimeout(() => {
                if (!this.state.isOpen) {
                    this.elements.chatBadge.classList.remove('hidden');
                    this.state.hasNewMessage = true;
                }
            }, 3000);
        },

        setupBadgeAutoHide() {
            setInterval(() => {
                if (this.state.hasNewMessage && !this.state.isOpen) {
                    setTimeout(() => {
                        if (!this.state.isOpen) {
                            this.elements.chatBadge.classList.add('hidden');
                            this.state.hasNewMessage = false;
                        }
                    }, 5000);
                }
            }, 1000);
        }
    };

    // Export for global access
    window.ChatAI = ChatAI;
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM Content Loaded - Initializing ChatAI...');
        ChatAI.init();
    });

