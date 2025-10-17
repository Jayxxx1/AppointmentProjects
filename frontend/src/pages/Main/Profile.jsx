import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { userService } from "../../services/userService";
import { User, Mail, CreditCard, Lock, Shield, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Profile() {
	const { user, setUser } = useAuth();
	const [fullName, setFullName] = useState(user?.fullName || "");
	const [email, setEmail] = useState(user?.email || "");
	const [studentId, setStudentId] = useState(user?.studentId || "");
	const [username, setUsername] = useState(user?.username || "");
	const [password, setPassword] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	useEffect(() => {
		// If user object updates, sync fields
		setFullName(user?.fullName || "");
		setEmail(user?.email || "");
		setStudentId(user?.studentId || "");
		setUsername(user?.username || "");
	}, [user]);

    const handleSave = async (e) => {
		e.preventDefault();
		setError("");
		setSuccess("");
		if (!fullName.trim()) {
			setError("กรุณากรอกชื่อและนามสกุลให้ครบถ้วน");
			return;
		}
		setSaving(true);
		try {
			// Update profile API (assume PATCH /api/users/me)
			const updated = await userService.updateProfile({ fullName, email, studentId, username, password });
			setUser({ ...user, fullName, email, studentId, username });
			setSuccess("บันทึกข้อมูลสำเร็จ");
		} catch (err) {
			setError(err?.message || "เกิดข้อผิดพลาด");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="relative min-h-full bg-gray-50">
			{/* BG image layer */}
			<div
				aria-hidden="true"
				className="absolute inset-0 z-0 pointer-events-none bg-[url('/bg/bg.webp')] bg-cover bg-center bg-no-repeat bg-fixed blur-sm opacity-30"
			/>
			<div aria-hidden="true" className="absolute inset-0 -z-10 bg-white/80 backdrop-blur-sm" />



			{/* Profile form */}
			<div className="relative z-10 max-w-6xl w-full mx-auto px-5 sm:px-8 py-10">
				<div className="rounded-lg shadow-sm overflow-hidden border border-gray-200">
					<div className="bg-white border-b border-gray-200 px-6 sm:px-8 py-5">
						<h1 className="text-xl sm:text-2xl font-semibold text-gray-900">โปรไฟล์ของคุณ</h1>
					</div>

					<div className="bg-white px-6 sm:px-8 py-8">
						<div className="grid lg:grid-cols-3 gap-8">
							{/* Left Column - Profile Avatar & Info */}
							<div className="lg:col-span-1">
								<div className="flex flex-col items-center gap-4 sticky top-8">
									<div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-4xl font-semibold shadow-lg">
										{fullName?.charAt(0) || username?.charAt(0) || "U"}
									</div>
									<div className="text-center">
										<h3 className="text-xl font-semibold text-gray-900">{fullName || "ไม่มีชื่อ"}</h3>
										<p className="text-gray-600">@{username}</p>
									</div>
									
									{/* Role Badge */}
									<div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200 w-full">
										<div className="flex items-center justify-center gap-2">
											<Shield className="w-5 h-5 text-gray-600" />
											<div className="text-center">
												<p className="text-sm text-gray-600 font-medium">บทบาท</p>
												<p className="text-gray-900 font-semibold">
													{user?.role === "student" ? "นักศึกษา" : 
													user?.role === "teacher" ? "อาจารย์" : 
													"ไม่มี"}
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Right Column - Form */}
							<div className="lg:col-span-2">
								<form onSubmit={handleSave} className="space-y-6">
									{/* Row 1: Full Name & Email */}
									<div className="grid md:grid-cols-2 gap-6">
										{/* Full Name */}
										<div>
											<label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
												ชื่อ-นามสกุล <span className="text-red-600">*</span>
											</label>
											<div className="relative">
												<div className="absolute left-3 top-1/2 -translate-y-1/2">
													<User className="w-5 h-5 text-gray-400" />
												</div>
												<input
													type="text"
													id="fullName"
													placeholder="กรอกชื่อ-นามสกุล"
													value={fullName}
													onChange={e => setFullName(e.target.value)}
													className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
													required
												/>
											</div>
										</div>

										{/* Email */}
										<div>
											<label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
												อีเมล <span className="text-red-600">*</span>
											</label>
											<div className="relative">
												<div className="absolute left-3 top-1/2 -translate-y-1/2">
													<Mail className="w-5 h-5 text-gray-400" />
												</div>
												<input
													type="email"
													id="email"
													placeholder="example@email.com"
													value={email}
													onChange={e => setEmail(e.target.value)}
													className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
													required
												/>
											</div>
										</div>
									</div>

									{/* Row 2: Student ID & Username */}
									<div className="grid md:grid-cols-2 gap-6">
										{/* Student ID */}
										<div>
											<label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
												รหัสนักศึกษา
											</label>
											<div className="relative">
												<div className="absolute left-3 top-1/2 -translate-y-1/2">
													<CreditCard className="w-5 h-5 text-gray-400" />
												</div>
												<input
													type="text"
													id="studentId"
													placeholder="รหัสนักศึกษา"
													value={studentId}
													onChange={e => setStudentId(e.target.value)}
													className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
												/>
											</div>
										</div>

										{/* Username */}
										<div>
											<label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
												ชื่อผู้ใช้ <span className="text-red-600">*</span>
											</label>
											<div className="relative">
												<div className="absolute left-3 top-1/2 -translate-y-1/2">
													<User className="w-5 h-5 text-gray-400" />
												</div>
												<input
													type="text"
													id="username"
													placeholder="username"
													value={username}
													onChange={e => setUsername(e.target.value)}
													className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
													required
												/>
											</div>
										</div>
									</div>

									{/* Row 3: Password */}
									<div>
										<label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
											เปลี่ยนรหัสผ่าน
										</label>
										<div className="relative">
											<div className="absolute left-3 top-1/2 -translate-y-1/2">
												<Lock className="w-5 h-5 text-gray-400" />
											</div>
											<input
												type="password"
												id="password"
												placeholder="เปลี่ยนรหัสผ่าน (ถ้าต้องการ)"
												value={password}
												onChange={e => setPassword(e.target.value)}
												className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
											/>
										</div>
										<p className="mt-1 text-xs text-gray-500">เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน</p>
									</div>

									{/* Error & Success Messages */}
									{error && (
										<div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
											<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
											<p className="text-sm text-red-800">{error}</p>
										</div>
									)}

									{success && (
										<div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
											<CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
											<p className="text-sm text-green-800">{success}</p>
										</div>
									)}

									{/* Submit Button */}
									<button
										type="submit"
										disabled={saving}
										className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm"
									>
										{saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
									</button>
								</form>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}