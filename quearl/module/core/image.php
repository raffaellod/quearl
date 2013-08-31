<?php
# -*- coding: utf-8; mode: php; tab-width: 3 -*-
#---------------------------------------------------------------------------------------------------
# Quearl
# Copyright 2005-2013 Raffaello D. Di Napoli
#---------------------------------------------------------------------------------------------------
# This file is part of Quearl.
#
# Quearl is free software: you can redistribute it and/or modify it under the terms of the GNU
# Affero General Public License as published by the Free Software Foundation, either version 3 of
# the License, or (at your option) any later version.
#
# Quearl is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even
# the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
# General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License along with Quearl. If
# not, see <http://www.gnu.org/licenses/>.
#---------------------------------------------------------------------------------------------------

# Basic image manipulation.


define('QUEARL_CORE_IMAGE_INCLUDED', true);



####################################################################################################
# Functions


## Resizes an image into a new file, whose name is returned. The aspect ration is unaffected, which
# means that the resulting image may be smaller than requested in either width or height, but not
# both (unless the source image was smaller than the requested size).
#
# string $sSrcFileName
#    Name of the source image file.
# string $sDstFileName (string)
#    Name of the destination image file; an appropriate extension will be added automatically.
# int $iDstMaxW
#    Maximum allowed width for the resulting image.
# int $iDstMaxH
#    Maximum allowed height for the resulting image.
# [int $iSrcX]
#    X-origin of the source image crop; defaults to 0.
# [int $iSrcY]
#    Y-origin of the source image crop; defaults to 0.
# [int $iSrcW]
#    Width of the source image crop; defaults to using the entire image width.
# [int $iSrcH]
#    Height of the source image crop; defaults to using the entire image height.
# string return
#    Name of the generated image file, or false if an error occurred.
#
function ql_image_copyresized(
	$sSrcFileName, $sDstFileName,
	$iDstMaxW, $iDstMaxH, $iSrcX = null, $iSrcY = null, $iSrcW = null, $iSrcH = null
) {
	list(, , $iType) = @getimagesize($sSrcFileName);
	$sDstFileName .= image_type_to_extension($iType);
	$s = ql_image_resize($sSrcFileName, $iDstMaxW, $iDstMaxH, $iSrcX, $iSrcY, $iSrcW, $iSrcH);
	return $s && @file_put_contents($sDstFileName, $s) ? $sDstFileName : false;
}


## Resizes an image, returning the resulting image data. The aspect ration is unaffected, which
# means that the resulting image may be smaller than requested in either width or height, but not
# both (unless the source image was smaller than the requested size).
#
# string $sFileName
#    Name of the source image file.
# int $iDstMaxW
#    Maximum allowed width for the resulting image.
# int $iDstMaxH
#    Maximum allowed height for the resulting image.
# [int $iSrcX]
#    X-origin of the source image crop; defaults to 0.
# [int $iSrcY]
#    Y-origin of the source image crop; defaults to 0.
# [int $iSrcW]
#    Width of the source image crop; defaults to using the entire image width.
# [int $iSrcH]
#    Height of the source image crop; defaults to using the entire image height.
# string return
#    Data of the generated image, or false if an error occurred.
#
function ql_image_resize(
	$sFileName,
	$iDstMaxW, $iDstMaxH, $iSrcX = null, $iSrcY = null, $iSrcW = null, $iSrcH = null
) {
	$arrImageInfo = getimagesize($sFileName);
	if (!$arrImageInfo) {
		return false;
	}

	# If no portion of the source image is specified, use the entire image.
	if ($iSrcX === null || $iSrcY === null || $iSrcW === null || $iSrcH === null) {
		$iSrcX = 0;
		$iSrcY = 0;
		$iSrcW = $arrImageInfo[0];
		$iSrcH = $arrImageInfo[1];
	}
	# If the source area is the entire image and it’s the requested size, return the image with no
	# additional processing.
	if (
		$iSrcX == 0 && $iSrcY == 0 && $iSrcW == $arrImageInfo[0] && $iSrcH == $arrImageInfo[1] &&
		$iSrcW <= $iDstMaxW && $iSrcH <= $iDstMaxH
	) {
		return @file_get_contents($sFileName);
	}

	# We need to process the image; this currently requires gd.
	if (!extension_loaded('gd')) {
		# TODO: log a warning about the absence of the gd extension.
		return false;
	}

	# Calculate the smallest ratio between source/destination width/height, and apply it to both
	# dimensions, to keep the aspect ratio unchanged.
	$fRatio = min($iDstMaxW / $iSrcW, $iDstMaxH / $iSrcH);
	$cxDst = round($iSrcW * $fRatio);
	$cyDst = round($iSrcH * $fRatio);
	$iType = $arrImageInfo[2];
	# Load the image data with the appropriate gd loader.
	switch ($iType) {
		case  1: if (imagetypes() & IMG_GIF ) $imgSrc = @imagecreatefromgif ($sFileName); break;
		case  2: if (imagetypes() & IMG_JPEG) $imgSrc = @imagecreatefromjpeg($sFileName); break;
		case  3: if (imagetypes() & IMG_PNG ) $imgSrc = @imagecreatefrompng ($sFileName); break;
		case 15: if (imagetypes() & IMG_WBMP) $imgSrc = @imagecreatefromwbmp($sFileName); break;
		default:
			# TODO: warn about the unsupported image type.
			return false;
	}
	if (empty($imgSrc)) {
		return false;
	}
	$imgDst = imagecreatetruecolor($cxDst, $cyDst);
	if (!$imgDst) {
		# TODO: log an error about being unable to create the destination image (out of memory?).
		return false;
	}
	imagecopyresampled($imgDst, $imgSrc, 0, 0, $iSrcX, $iSrcY, $cxDst, $cyDst, $iSrcW, $iSrcH);
	imagedestroy($imgSrc);
	# Create a new output buffer, write the image to it in the requested format…
	ob_start();
	switch ($iType) {
		case  1: $bRet = imagegif ($imgDst); break;
		case  2: $bRet = imagejpeg($imgDst); break;
		case  3: $bRet = imagepng ($imgDst); break;
		case 15: $bRet = imagewbmp($imgDst); break;
	}
	# …then get the output buffer’s contents, and discard the buffer.
	$sImage = ob_get_contents();
	ob_end_clean();
	imagedestroy($imgDst);
	return $bRet ? $sImage : false;
}

?>
