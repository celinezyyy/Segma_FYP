-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 13, 2025 at 09:05 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `jomstay`
--

-- --------------------------------------------------------

--
-- Table structure for table `hotels`
--

CREATE TABLE `hotels` (
  `hotel_id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `location` text DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hotels`
--

INSERT INTO `hotels` (`hotel_id`, `name`, `location`, `state`, `description`, `image_url`) VALUES
(1, 'Agile Ritz Garden by TRX', 'Residensi Agile Delima, BLOCK B, 3, Jalan Delima, Imbi, 55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur', 'Kuala Lumpur', 'Comfortable apartment-style stays with pool, garden, and easy access to TRX and Bukit Bintang.', 'https://example.com/images/agile_ritz.jpg'),
(2, 'The Majestic Kuala Lumpur', '5 Jalan Sultan Hishamuddin, 50000 Kuala Lumpur', 'Kuala Lumpur', 'Heritage-style luxury near KL Sentral with colonial charm and modern comfort.', 'https://example.com/images/majestic_kl.jpg'),
(3, 'Traders Hotel Kuala Lumpur', 'Kuala Lumpur City Centre, 50088 Kuala Lumpur', 'Kuala Lumpur', 'Contemporary hotel with KLCC park and Petronas Towers view, perfect for business and leisure.', 'https://example.com/images/traders_kl.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `hotel_amenities`
--

CREATE TABLE `hotel_amenities` (
  `hotel_id` int(11) NOT NULL,
  `air_conditioner` tinyint(1) DEFAULT NULL,
  `outdoor_swimming_pool` tinyint(1) DEFAULT NULL,
  `room_service` tinyint(1) DEFAULT NULL,
  `front_desk_24h` tinyint(1) DEFAULT NULL,
  `terrace` tinyint(1) DEFAULT NULL,
  `fitness_centre` tinyint(1) DEFAULT NULL,
  `free_parking` tinyint(1) DEFAULT NULL,
  `free_wifi` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hotel_amenities`
--

INSERT INTO `hotel_amenities` (`hotel_id`, `air_conditioner`, `outdoor_swimming_pool`, `room_service`, `front_desk_24h`, `terrace`, `fitness_centre`, `free_parking`, `free_wifi`) VALUES
(1, 1, 1, 1, 1, 1, 1, 1, 1),
(2, 1, 0, 1, 1, 0, 1, 1, 1),
(3, 1, 1, 0, 1, 1, 0, 0, 1);

-- --------------------------------------------------------

--
-- Table structure for table `hotel_images`
--

CREATE TABLE `hotel_images` (
  `image_id` int(11) NOT NULL,
  `hotel_id` int(11) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `is_cover` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hotel_images`
--

INSERT INTO `hotel_images` (`image_id`, `hotel_id`, `image_url`, `is_cover`) VALUES
(1, 1, 'assets/Hotel1/room.jpg', 0),
(2, 1, 'assets/Hotel1/pool.jpg', 0),
(3, 1, 'assets/Hotel1/dining.jpg', 0),
(4, 1, '../assets/Hotel1/outside.jpg', 1),
(9, 2, 'assets/Hotel2/room.jpg', 0),
(10, 2, 'assets/Hotel2/gym.jpg', 0),
(11, 3, 'assets/Hotel3/room.jpg', 0),
(12, 3, 'assets/Hotel3/swim.jpg', 0);

-- --------------------------------------------------------

--
-- Table structure for table `room_availability`
--

CREATE TABLE `room_availability` (
  `availability_id` int(11) NOT NULL,
  `room_type_id` int(11) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `available_rooms` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `room_availability`
--

INSERT INTO `room_availability` (`availability_id`, `room_type_id`, `date`, `available_rooms`) VALUES
(1, 101, '2025-06-23', 5),
(2, 101, '2025-06-24', 3),
(3, 101, '2025-06-25', 4),
(4, 102, '2025-06-23', 2),
(5, 102, '2025-06-24', 2),
(6, 102, '2025-06-25', 1),
(7, 103, '2025-06-23', 1),
(8, 103, '2025-06-24', 1),
(9, 103, '2025-06-25', 0);

-- --------------------------------------------------------

--
-- Table structure for table `room_types`
--

CREATE TABLE `room_types` (
  `room_type_id` int(11) NOT NULL,
  `hotel_id` int(11) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `bed_config` text DEFAULT NULL,
  `max_adults` int(11) DEFAULT NULL,
  `max_kids` int(11) DEFAULT NULL,
  `views` text DEFAULT NULL,
  `features` text DEFAULT NULL,
  `cancellation_type` varchar(50) DEFAULT NULL,
  `free_cancellation_cutoff_days` int(11) DEFAULT NULL,
  `cancellation_description` text DEFAULT NULL,
  `price` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `room_types`
--

INSERT INTO `room_types` (`room_type_id`, `hotel_id`, `name`, `bed_config`, `max_adults`, `max_kids`, `views`, `features`, `cancellation_type`, `free_cancellation_cutoff_days`, `cancellation_description`, `price`) VALUES
(101, 1, 'Standard Double Room', '1 King Bed', 2, 1, 'City View', 'Private Kitchen,Free Wifi,Terrace,Dishwasher,Air Conditioning', 'free_before', 2, 'Free cancellation up to 2 days before check-in.', 220),
(102, 1, 'Superior Studio', '1 King Bed,1 Sofa Bed', 3, 1, 'City View,Pool View', 'Private Kitchen,Coffee Machine,Terrace,Dishwasher,Air Conditioning', 'free_before', 3, 'Free cancellation up to 3 days before check-in.', 310),
(103, 1, 'Deluxe Family Suite', '2 Queen Beds, 1 Sofa Bed', 5, 2, 'Garden View, Pool View', 'Private Kitchen, Washer, Dishwasher, Free Wifi, Coffee Machine', 'free_before', 5, 'Free cancellation up to 5 days before check-in.', 450),
(201, 2, 'Colonial Classic Room', '1 Queen Bed', 2, 0, 'Garden View', 'Air Conditioning, Free Wifi, Mini Fridge', 'free_before', 1, 'Free cancellation up to 1 day before check-in.', 180),
(202, 2, 'Majestic Executive Suite', '1 King Bed, 1 Sofa Bed', 3, 1, 'City View', 'Free Wifi, Coffee Machine, Private Kitchen, Air Conditioning', 'free_before', 3, 'Free cancellation up to 3 days before check-in.', 270),
(203, 2, 'Presidential Heritage Suite', '2 King Beds', 4, 2, 'City View, Garden View', 'Free Wifi, Terrace, Coffee Machine, Washer, Air Conditioning', 'free_before', 7, 'Free cancellation up to 7 days before check-in.', 390),
(301, 3, 'Business Deluxe Room', '1 King Bed', 2, 1, 'KLCC View', 'Free Wifi, Air Conditioning, Desk', 'free_before', 2, 'Free cancellation up to 2 days before check-in.', 200),
(302, 3, 'Twin Tower View Studio', '1 King Bed, 1 Sofa Bed', 3, 1, 'KLCC View, City View', 'Free Wifi, Coffee Machine, Private Kitchen, Air Conditioning', 'free_before', 3, 'Free cancellation up to 3 days before check-in.', 270),
(303, 3, 'Executive Family Suite', '2 Queen Beds, 1 Single Bed', 4, 2, 'City View, Park View', 'Private Kitchen, Free Wifi, Dishwasher, Terrace, Air Conditioning', 'free_before', 5, 'Free cancellation up to 5 days before check-in.', 490);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `userId` int(11) NOT NULL,
  `fullName` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `isVerified` tinyint(1) DEFAULT 0,
  `verificationToken` varchar(255) DEFAULT NULL,
  `verificationTokenExpiry` datetime DEFAULT NULL,
  `resetToken` varchar(255) DEFAULT NULL,
  `resetTokenExpiry` datetime DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `phoneNumber` varchar(20) DEFAULT NULL,
  `gender` enum('Male','Female') DEFAULT NULL,
  `dateOfBirth` date DEFAULT NULL,
  `race` enum('Malay','Chinese','Indian','Bumiputera','Other') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`userId`, `fullName`, `email`, `password`, `isVerified`, `verificationToken`, `verificationTokenExpiry`, `resetToken`, `resetTokenExpiry`, `createdAt`, `phoneNumber`, `gender`, `dateOfBirth`, `race`) VALUES
(6, 'LingLingKwong', 'yuyandipsy526@gmail.com', '$2y$10$YueE4uiBQkLUvpXDlu7zQOIZj/B/qLeDCVC20hhHxtlQhSW/jJlWq', 1, NULL, NULL, NULL, NULL, '2025-06-13 10:35:08', '012-2649630', 'Female', '2002-12-22', 'Chinese');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `hotels`
--
ALTER TABLE `hotels`
  ADD PRIMARY KEY (`hotel_id`);

--
-- Indexes for table `hotel_amenities`
--
ALTER TABLE `hotel_amenities`
  ADD PRIMARY KEY (`hotel_id`);

--
-- Indexes for table `hotel_images`
--
ALTER TABLE `hotel_images`
  ADD PRIMARY KEY (`image_id`),
  ADD KEY `hotel_id` (`hotel_id`);

--
-- Indexes for table `room_availability`
--
ALTER TABLE `room_availability`
  ADD PRIMARY KEY (`availability_id`),
  ADD KEY `room_type_id` (`room_type_id`);

--
-- Indexes for table `room_types`
--
ALTER TABLE `room_types`
  ADD PRIMARY KEY (`room_type_id`),
  ADD KEY `hotel_id` (`hotel_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`userId`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `hotel_images`
--
ALTER TABLE `hotel_images`
  MODIFY `image_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `userId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `hotel_amenities`
--
ALTER TABLE `hotel_amenities`
  ADD CONSTRAINT `hotel_amenities_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`hotel_id`);

--
-- Constraints for table `hotel_images`
--
ALTER TABLE `hotel_images`
  ADD CONSTRAINT `hotel_images_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`hotel_id`);

--
-- Constraints for table `room_availability`
--
ALTER TABLE `room_availability`
  ADD CONSTRAINT `room_availability_ibfk_1` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`room_type_id`);

--
-- Constraints for table `room_types`
--
ALTER TABLE `room_types`
  ADD CONSTRAINT `room_types_ibfk_1` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`hotel_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
